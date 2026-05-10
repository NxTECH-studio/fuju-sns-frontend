import { createBus, type Bus } from './bus';
import { clearSessionHint, readSessionHint, writeSessionHint } from './sessionHint';
import { isNewSocialUser, markSocialUserSeen } from './socialSignupSeen';
import { ApiClient } from '../api/ApiClient';
import * as authApi from '../api/endpoints/auth';
import * as mfaApi from '../api/endpoints/mfa';
import * as socialApi from '../api/endpoints/social';
import * as userApi from '../api/endpoints/user';
import type { UserProfileResponse } from '../api/endpoints/user';
import { ErrorCodes } from '../ErrorCodes';
import { createAuthError, isAuthError } from '../isAuthError';
import type {
  AuthConfig,
  AuthDiagnosticEvent,
  AuthError,
  AuthStatus,
  LoginResult,
  MFASetupResult,
  SocialProvider,
  User,
} from '../types';
import { buildOtpauthURL } from '../utils/otpauth';

export interface AuthSnapshot {
  status: AuthStatus;
  user: User | null;
  preTokenPresent: boolean;
  error: AuthError | null;
  mfaAttempts: number;
  needsPublicIdSetup: boolean;
}

type Listener = () => void;

const SILENT_REFRESH_LEAD_SEC = 30;
const MIN_SILENT_REFRESH_DELAY_SEC = 5;
const BOOTSTRAP_RETRY_DELAYS_MS = [500, 2000, 8000];
// hint がある状態で 401 を受けた場合に挟む短いリトライ。network blip 相当の
// 一時的な Cookie 送信失敗 / rotation 競合を吸収するため、意図的に短い。
const BOOTSTRAP_HINT_RETRY_DELAYS_MS = [300, 1200];

export class AuthStore {
  private snapshot: AuthSnapshot = {
    status: 'idle',
    user: null,
    preTokenPresent: false,
    error: null,
    mfaAttempts: 0,
    needsPublicIdSetup: false,
  };

  private readonly listeners = new Set<Listener>();
  private accessToken: string | null = null;
  private accessExp: number | null = null;
  private preToken: string | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private refreshInFlight: Promise<boolean> | null = null;
  private busUnsubscribe: (() => void) | null = null;
  private visibilityHandler: (() => void) | null = null;
  private disposed = false;

  private readonly api: ApiClient;
  private readonly bus: Bus;

  constructor(private readonly config: AuthConfig) {
    const fetchImpl = config.fetch ?? getGlobalFetch();
    this.api = new ApiClient(
      config.baseURL,
      () => this.accessToken,
      () => this.runRefresh('on-unauthorized'),
      fetchImpl,
      (path) => this.emit({ type: 'unauthorized-from-api', path }),
    );
    this.bus = createBus();
    this.busUnsubscribe = this.bus.subscribe((ev) => this.onBusEvent(ev.type));
  }

  private emit(event: AuthDiagnosticEvent): void {
    const fn = this.config.onDiagnostic;
    if (fn === undefined) return;
    try {
      fn(event);
    } catch {
      /* diagnostic は best-effort — コンシューマー側の例外で本線を止めない */
    }
  }

  // --- External store surface ---
  getSnapshot = (): AuthSnapshot => this.snapshot;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private update(patch: Partial<AuthSnapshot>): void {
    if (this.disposed) return;
    this.snapshot = { ...this.snapshot, ...patch };
    for (const l of this.listeners) l();
  }

  // --- Lifecycle ---
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.clearSilentRefresh();
    this.busUnsubscribe?.();
    this.busUnsubscribe = null;
    this.bus.close();
    if (this.visibilityHandler && globalThis.document !== undefined) {
      globalThis.document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
  }

  getAuthToken(): string | null {
    return this.accessToken;
  }

  // --- Bootstrap (§8.1) ---
  async bootstrap(): Promise<void> {
    if (this.snapshot.status !== 'idle') return;
    this.update({ status: 'authenticating', error: null });
    this.emit({ type: 'bootstrap-start' });

    const hint = readSessionHint();
    const hintPresent = hint !== null;
    let hintRetries = 0;

    for (let attempt = 0; ; attempt++) {
      try {
        const res = await authApi.refresh(this.api);
        this.adoptTokens(res.access_token, res.expires_in);
        const user = await this.loadProfile();
        const needsSetup = user.linkedProviders.length > 0 && isNewSocialUser(user.id);
        this.update({
          status: 'authenticated',
          error: null,
          needsPublicIdSetup: needsSetup,
        });
        writeSessionHint(user.id);
        this.emit({ type: 'session-hint-write', userId: user.id });
        this.scheduleSilentRefresh();
        this.emit({ type: 'bootstrap-success' });
        return;
      } catch (e) {
        if (!isAuthError(e)) {
          const err = toAuthError(e);
          this.update({ status: 'error', error: err });
          this.emit({ type: 'bootstrap-error', error: err });
          return;
        }
        // 4xx（429 除く）: 直前まで認証済みだった hint があれば短リトライを
        // 挟む。hint が無い / リトライ尽きなら即 unauthenticated 確定。
        if (e.status >= 400 && e.status < 500 && e.status !== 429) {
          if (hintPresent && hintRetries < BOOTSTRAP_HINT_RETRY_DELAYS_MS.length) {
            const delayMs = BOOTSTRAP_HINT_RETRY_DELAYS_MS[hintRetries] ?? 0;
            hintRetries++;
            this.emit({
              type: 'bootstrap-retry',
              attempt: hintRetries,
              delayMs,
              reason: 'hint',
            });
            await sleep(delayMs);
            if (this.disposed) return;
            continue;
          }
          this.clearSession();
          clearSessionHint();
          if (hintPresent) this.emit({ type: 'session-hint-clear' });
          this.update({ status: 'unauthenticated', user: null, error: null });
          this.emit({ type: 'bootstrap-unauthenticated', hintUsed: hintPresent });
          return;
        }
        if (e.status === 0 && attempt < BOOTSTRAP_RETRY_DELAYS_MS.length) {
          const delayMs = BOOTSTRAP_RETRY_DELAYS_MS[attempt] ?? 0;
          this.emit({
            type: 'bootstrap-retry',
            attempt: attempt + 1,
            delayMs,
            reason: 'network',
          });
          await sleep(delayMs);
          if (this.disposed) return;
          continue;
        }
        this.update({ status: 'error', error: e });
        this.emit({ type: 'bootstrap-error', error: e });
        return;
      }
    }
  }

  // --- Login (§9.1) ---
  async login(input: { identifier: string; password: string }): Promise<LoginResult> {
    this.update({ status: 'authenticating', error: null });
    try {
      const res = await authApi.login(this.api, input);
      if ('mfa_required' in res && res.mfa_required) {
        this.preToken = res.pre_token;
        this.update({
          status: 'mfa_required',
          preTokenPresent: true,
          mfaAttempts: 0,
          error: null,
        });
        this.emit({ type: 'login-success', mfaRequired: true });
        return { kind: 'mfa_required' };
      }
      this.adoptTokens(res.access_token, res.expires_in);
      const user = await this.loadProfile();
      this.update({ status: 'authenticated', error: null });
      writeSessionHint(user.id);
      this.emit({ type: 'session-hint-write', userId: user.id });
      this.scheduleSilentRefresh();
      this.emit({ type: 'login-success', mfaRequired: false });
      this.bus.post({ type: 'login-completed', at: Date.now() });
      return { kind: 'authenticated', user };
    } catch (e) {
      const err = toAuthError(e);
      this.update({
        status: this.snapshot.user ? 'authenticated' : 'unauthenticated',
        error: err,
      });
      throw err;
    }
  }

  // --- Register (§9.5) ---
  async register(input: { email: string; password: string; publicId: string }): Promise<User> {
    try {
      const res = await authApi.register(this.api, {
        email: input.email,
        password: input.password,
        public_id: input.publicId,
      });
      return mapRegisterToUser(res);
    } catch (e) {
      throw toAuthError(e);
    }
  }

  // --- Logout (§9.3) ---
  async logout(): Promise<void> {
    try {
      await authApi.logout(this.api);
    } catch {
      /* ignore — local state takes precedence */
    }
    this.clearSession();
    clearSessionHint();
    this.emit({ type: 'session-hint-clear' });
    this.update({
      status: 'unauthenticated',
      user: null,
      preTokenPresent: false,
      mfaAttempts: 0,
      error: null,
      needsPublicIdSetup: false,
    });
    this.bus.post({ type: 'logout' });
  }

  // --- Refresh (§8.2) ---
  private async runRefresh(
    cause: 'silent' | 'on-unauthorized' | 'manual' = 'silent',
  ): Promise<boolean> {
    if (this.refreshInFlight !== null) return this.refreshInFlight;
    this.emit({ type: 'refresh-start', cause });
    this.refreshInFlight = (async () => {
      try {
        const res = await authApi.refresh(this.api);
        this.adoptTokens(res.access_token, res.expires_in);
        if (this.snapshot.status !== 'authenticated') {
          try {
            await this.loadProfile();
            this.update({ status: 'authenticated', error: null });
          } catch {
            this.clearSession();
            clearSessionHint();
            this.emit({ type: 'session-hint-clear' });
            this.update({ status: 'unauthenticated', user: null });
            this.emit({ type: 'refresh-failure', cause, error: null });
            return false;
          }
        }
        const userId = this.snapshot.user?.id;
        if (userId !== undefined) {
          writeSessionHint(userId);
          this.emit({ type: 'session-hint-write', userId });
        }
        this.scheduleSilentRefresh();
        this.emit({ type: 'refresh-success', cause });
        return true;
      } catch (e) {
        if (isAuthError(e) && (e.status === 401 || e.status === 403)) {
          this.clearSession();
          clearSessionHint();
          this.emit({ type: 'session-hint-clear' });
          this.update({ status: 'unauthenticated', user: null });
        }
        this.emit({
          type: 'refresh-failure',
          cause,
          error: isAuthError(e) ? e : null,
        });
        return false;
      } finally {
        this.refreshInFlight = null;
      }
    })();
    return this.refreshInFlight;
  }

  async refresh(): Promise<boolean> {
    return this.runRefresh('manual');
  }

  // --- MFA verify (§9.2) ---
  async verifyMFA(input: { code?: string; recoveryCode?: string }): Promise<void> {
    if (!this.preToken) {
      throw createAuthError('no pre-token in scope', ErrorCodes.TOKEN_INVALID, 401);
    }
    try {
      const body: { code?: string; recovery_code?: string } = {};
      if (input.code !== undefined) body.code = input.code;
      if (input.recoveryCode !== undefined) body.recovery_code = input.recoveryCode;
      const res = await mfaApi.verifyMFA(this.api, this.preToken, body);
      this.preToken = null;
      this.adoptTokens(res.access_token, res.expires_in);
      const user = await this.loadProfile();
      this.update({
        status: 'authenticated',
        preTokenPresent: false,
        mfaAttempts: 0,
        error: null,
      });
      writeSessionHint(user.id);
      this.emit({ type: 'session-hint-write', userId: user.id });
      this.scheduleSilentRefresh();
      this.emit({ type: 'mfa-verify-success' });
      this.bus.post({ type: 'login-completed', at: Date.now() });
    } catch (e) {
      const err = toAuthError(e);
      if (
        err.code === ErrorCodes.TOTP_CODE_INVALID ||
        err.code === ErrorCodes.RECOVERY_CODE_INVALID
      ) {
        this.update({ mfaAttempts: this.snapshot.mfaAttempts + 1 });
      }
      throw err;
    }
  }

  cancelMFA(): void {
    this.preToken = null;
    clearSessionHint();
    this.emit({ type: 'session-hint-clear' });
    this.update({
      status: 'unauthenticated',
      preTokenPresent: false,
      mfaAttempts: 0,
      user: null,
      error: null,
    });
  }

  // --- Profile ---
  async refreshProfile(): Promise<User> {
    return this.loadProfile();
  }

  async updatePublicID(next: string): Promise<User> {
    await userApi.updatePublicId(this.api, { public_id: next }).catch((e) => {
      throw toAuthError(e);
    });
    return this.loadProfile();
  }

  async updateIcon(file: File): Promise<User> {
    await userApi.updateIcon(this.api, file).catch((e) => {
      throw toAuthError(e);
    });
    return this.loadProfile();
  }

  // --- MFA setup ---
  async setupMFA(): Promise<MFASetupResult> {
    try {
      const res = await mfaApi.registerMFA(this.api);
      const issuer = this.config.mfaIssuer ?? 'Fuju';
      const accountName = this.snapshot.user?.email ?? this.snapshot.user?.publicId ?? 'user';
      const otpauthURL = buildOtpauthURL({
        secret: res.secret,
        accountName,
        issuer,
      });
      return {
        secret: res.secret,
        qrCodeDataURL: res.qr_code,
        recoveryCodes: res.recovery_codes,
        otpauthURL,
      };
    } catch (e) {
      throw toAuthError(e);
    }
  }

  async enableMFA(code: string): Promise<User> {
    try {
      await mfaApi.enableMFA(this.api, { code });
    } catch (e) {
      throw toAuthError(e);
    }
    return this.loadProfile();
  }

  async disableMFA(code: string): Promise<User> {
    try {
      await mfaApi.disableMFA(this.api, { code });
    } catch (e) {
      throw toAuthError(e);
    }
    return this.loadProfile();
  }

  // --- Social ---
  connectSocial(provider: SocialProvider): void {
    if (globalThis.window === undefined) return;
    const redirectURI = this.socialRedirectURI(provider);
    const url = socialApi.buildConnectURL(this.config.baseURL, provider, redirectURI);
    globalThis.window.location.assign(url);
  }

  async disconnectSocial(provider: SocialProvider): Promise<User> {
    try {
      await socialApi.disconnectSocial(this.api, provider);
    } catch (e) {
      throw toAuthError(e);
    }
    return this.loadProfile();
  }

  async completeSocialCallback(
    provider: SocialProvider,
    params: { state: string; code: string },
  ): Promise<User> {
    try {
      const redirectURI = this.socialRedirectURI(provider);
      const res = await socialApi.socialCallback(this.api, provider, {
        state: params.state,
        code: params.code,
        redirect_uri: redirectURI !== '' ? redirectURI : undefined,
      });
      this.adoptTokens(res.access_token, res.expires_in);
      const user = await this.loadProfile();
      this.update({
        status: 'authenticated',
        error: null,
        needsPublicIdSetup: isNewSocialUser(user.id),
      });
      writeSessionHint(user.id);
      this.emit({ type: 'session-hint-write', userId: user.id });
      this.scheduleSilentRefresh();
      this.bus.post({ type: 'login-completed', at: Date.now() });
      return user;
    } catch (e) {
      throw toAuthError(e);
    }
  }

  async confirmSocialSignupPublicId(next: string): Promise<User> {
    const currentUser = this.snapshot.user;
    if (!currentUser) {
      throw createAuthError('no authenticated user', ErrorCodes.TOKEN_INVALID, 401);
    }
    try {
      await userApi.updatePublicId(this.api, { public_id: next });
    } catch (e) {
      throw toAuthError(e);
    }
    const user = await this.loadProfile();
    markSocialUserSeen(currentUser.id);
    this.update({ needsPublicIdSetup: false });
    return user;
  }

  skipSocialSignupPublicId(): void {
    const userId = this.snapshot.user?.id;
    if (userId !== undefined) {
      markSocialUserSeen(userId);
    }
    this.update({ needsPublicIdSetup: false });
  }

  // --- internal helpers ---
  private socialRedirectURI(provider: SocialProvider): string {
    if (this.config.socialRedirectURI) return this.config.socialRedirectURI;
    if (globalThis.window === undefined) return '';
    return `${globalThis.window.location.origin}/auth/callback/${provider}`;
  }

  private clearSession(): void {
    this.accessToken = null;
    this.accessExp = null;
    this.preToken = null;
    this.clearSilentRefresh();
  }

  private adoptTokens(accessToken: string, expiresInSec: number): void {
    this.accessToken = accessToken;
    this.accessExp = Math.floor(Date.now() / 1000) + expiresInSec;
  }

  private async loadProfile(): Promise<User> {
    const raw = await userApi.getProfile(this.api);
    const user = mapProfileToUser(raw);
    this.update({ user });
    return user;
  }

  private clearSilentRefresh(): void {
    if (this.refreshTimer !== null) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private scheduleSilentRefresh(): void {
    this.clearSilentRefresh();
    if (this.disposed) return;
    if (this.config.disableSilentRefresh) return;
    if (this.accessExp === null) return;

    const nowSec = Math.floor(Date.now() / 1000);
    const delaySec = Math.max(
      MIN_SILENT_REFRESH_DELAY_SEC,
      this.accessExp - nowSec - SILENT_REFRESH_LEAD_SEC,
    );

    const doc = globalThis.document;
    if (doc?.visibilityState === 'hidden') {
      this.ensureVisibilityHandler();
      return;
    }

    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null;
      void this.runRefresh('silent');
    }, delaySec * 1000);
  }

  private ensureVisibilityHandler(): void {
    const doc = globalThis.document;
    if (this.visibilityHandler || doc === undefined) return;
    this.visibilityHandler = () => {
      if (doc.visibilityState === 'visible') {
        this.scheduleSilentRefresh();
      }
    };
    doc.addEventListener('visibilitychange', this.visibilityHandler);
  }

  private onBusEvent(type: 'logout' | 'login-completed'): void {
    if (this.disposed) return;
    if (type === 'logout') {
      this.clearSession();
      clearSessionHint();
      this.emit({ type: 'session-hint-clear' });
      this.update({
        status: 'unauthenticated',
        user: null,
        preTokenPresent: false,
        mfaAttempts: 0,
        needsPublicIdSetup: false,
      });
    } else if (type === 'login-completed') {
      if (this.snapshot.status !== 'authenticated') {
        void this.runRefresh('manual');
      }
    }
  }
}

function getGlobalFetch(): typeof fetch {
  if (typeof fetch !== 'function') {
    throw new TypeError('global fetch is not available — provide config.fetch');
  }
  return fetch.bind(globalThis);
}

function mapProfileToUser(raw: UserProfileResponse): User {
  return {
    id: raw.id,
    publicId: raw.public_id,
    displayName: raw.display_name ?? raw.public_id,
    email: raw.email,
    iconUrl: raw.icon_url,
    mfaEnabled: raw.mfa_enabled,
    mfaVerified: raw.mfa_verified ?? raw.mfa_enabled,
    linkedProviders: raw.linked_providers ?? [],
    createdAt: raw.created_at,
  };
}

function mapRegisterToUser(raw: {
  id: string;
  email: string;
  public_id: string;
  mfa_enabled: boolean;
  icon_url: string | null;
  created_at: string;
}): User {
  return {
    id: raw.id,
    publicId: raw.public_id,
    displayName: raw.public_id,
    email: raw.email,
    iconUrl: raw.icon_url,
    mfaEnabled: raw.mfa_enabled,
    mfaVerified: false,
    linkedProviders: [],
    createdAt: raw.created_at,
  };
}

function toAuthError(e: unknown): AuthError {
  if (isAuthError(e)) return e;
  const msg = e instanceof Error ? e.message : 'unknown error';
  return createAuthError(msg, ErrorCodes.NETWORK_ERROR, 0);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
