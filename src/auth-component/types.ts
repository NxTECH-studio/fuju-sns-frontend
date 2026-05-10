import { type CSSProperties, type ReactNode, type ComponentType } from 'react';

export type SocialProvider = 'google' | 'twitch' | 'x';

export type AuthStatus =
  | 'idle'
  | 'authenticating'
  | 'authenticated'
  | 'mfa_required'
  | 'unauthenticated'
  | 'error';

export interface User {
  readonly id: string;
  readonly publicId: string;
  readonly displayName: string;
  readonly email: string;
  readonly iconUrl: string | null;
  readonly mfaEnabled: boolean;
  readonly mfaVerified: boolean;
  readonly linkedProviders: readonly SocialProvider[];
  readonly createdAt: string;
}

export interface AuthError extends Error {
  readonly code: string;
  readonly status: number;
  readonly retryAfterSec?: number;
}

export type LoginResult = { kind: 'authenticated'; user: User } | { kind: 'mfa_required' };

export interface MFASetupResult {
  readonly secret: string;
  readonly qrCodeDataURL: string;
  readonly recoveryCodes: readonly string[];
  /**
   * Authenticator アプリ（Google Authenticator / 1Password / Authy など）を
   * secret 入力済みで起動するためのディープリンク。`otpauth://totp/...` 形式で、
   * クライアント側で `secret` から組み立てたもの（バックエンド契約には含まれない）。
   * モバイルからセットアップする場合に `<a href={otpauthURL}>` で誘導できる。
   */
  readonly otpauthURL: string;
}

/**
 * AuthStore から発火される内部イベント。bootstrap / refresh / login / MFA verify /
 * 401 ハンドリング / session-hint のライフサイクルを外部から観測するためのフック
 * （`AuthConfig.onDiagnostic`）に渡される。
 * 将来の互換性を維持するため、列挙は open ended（unknown イベントは無視する設計）。
 * - `login-success` は `/v1/auth/login` 応答が成功した時点で発火し、後続が MFA 要求か
 *   認証完了かを `mfaRequired` で示す。認証完了のみを検知したい場合は `mfaRequired`
 *   が false のものだけを拾うか、`mfa-verify-success` と組み合わせて判定する。
 */
export type AuthDiagnosticEvent =
  | { type: 'bootstrap-start' }
  | { type: 'bootstrap-retry'; attempt: number; delayMs: number; reason: 'network' | 'hint' }
  | { type: 'bootstrap-success' }
  | { type: 'bootstrap-unauthenticated'; hintUsed: boolean }
  | { type: 'bootstrap-error'; error: AuthError }
  | { type: 'refresh-start'; cause: 'silent' | 'on-unauthorized' | 'manual' }
  | { type: 'refresh-success'; cause: 'silent' | 'on-unauthorized' | 'manual' }
  | {
      type: 'refresh-failure';
      cause: 'silent' | 'on-unauthorized' | 'manual';
      error: AuthError | null;
    }
  | { type: 'unauthorized-from-api'; path: string }
  | { type: 'session-hint-write'; userId: string }
  | { type: 'session-hint-clear' }
  | { type: 'login-success'; mfaRequired: boolean }
  | { type: 'mfa-verify-success' };

export interface MFAChallengeProps {
  verify: (input: { code?: string; recoveryCode?: string }) => Promise<void>;
  attempts: number;
  cancel: () => void;
  className?: string;
  style?: CSSProperties;
}

export interface MFASetupRecommendedApp {
  readonly name: string;
  readonly url?: string;
  readonly note?: string;
}

export interface MFASetupWizardProps {
  onComplete?: () => void;
  className?: string;
  style?: CSSProperties;
  /**
   * intro ステップで描画する説明領域。指定するとデフォルトの説明文と
   * `recommendedApps` リストの両方が置き換えられる。consumer 側で文言や外部
   * リンクを完全に制御したい場合に使う。
   */
  introContent?: ReactNode;
  /**
   * intro ステップでデフォルト UI が出すときに「対応アプリ例」として描画する一覧。
   * `introContent` を指定した場合は無視される。`url` があればアンカーになる。
   */
  recommendedApps?: ReadonlyArray<MFASetupRecommendedApp>;
  /**
   * QR ステップ上部の説明領域。未指定ならデフォルト文言（authenticator アプリで
   * QR をスキャンするか secret を直接入力する旨）が描画される。
   */
  qrInstructions?: ReactNode;
  /**
   * `otpauth://` ディープリンクのアンカーテキスト。既定は
   * `'authenticator アプリで開く'`。
   */
  mobileDeepLinkLabel?: string;
  /**
   * QR ステップで secret を初期状態から表示するか。既定 `false`（「シークレットキーを表示」
   * トグルで開く）。プレゼン中など第三者の目に触れる文脈ではデフォルトのまま運用する。
   */
  showSecretByDefault?: boolean;
}

export interface LoginFormProps {
  login: (input: { identifier: string; password: string }) => Promise<LoginResult>;
  loginWithSocial: (provider: SocialProvider) => void;
  register: (input: { email: string; password: string; publicId: string }) => Promise<User>;
  providers?: readonly SocialProvider[];
  onRegisterClick?: () => void;
  className?: string;
  style?: CSSProperties;
}

export interface RegisterFormProps {
  register: (input: { email: string; password: string; publicId: string }) => Promise<User>;
  login?: (input: { identifier: string; password: string }) => Promise<LoginResult>;
  loginWithSocial?: (provider: SocialProvider) => void;
  providers?: readonly SocialProvider[];
  onLoginClick?: () => void;
  onSuccess?: (user: User) => void;
  className?: string;
  style?: CSSProperties;
}

export interface SocialSignupPublicIdFormProps {
  user: User;
  submit: (publicId: string) => Promise<void>;
  skip: () => void;
  className?: string;
  style?: CSSProperties;
}

export interface AuthConfig {
  /** AuthCore のベース URL。例: `https://auth.fuju.example.com`。 */
  baseURL: string;
  /**
   * 未認証状態で AuthGuard に到達したときに呼ばれる。ホスト側のルーターで
   * `/login` などへ遷移させるために使う。未指定なら AuthGuard が組み込みの
   * LoginForm を直接描画する。
   */
  onUnauthenticatedNavigate?: (path: string) => void;
  /**
   * ソーシャルログインのコールバック URL。AuthCore 側の OAuth クライアントに
   * 登録した値と一致させる。未指定なら `${location.origin}/auth/callback/:provider`。
   */
  socialRedirectURI?: string;
  /**
   * デフォルト UI に並べるソーシャルログインボタンの一覧。`['google']` を渡すと
   * LoginForm / RegisterForm に「Googleログイン」「Googleで登録」ボタンが並ぶ。
   * 未指定 or 空配列ならソーシャルボタンは描画されない（メール + パスワードのみ）。
   * AuthGuard が `loginWithSocial` を自動で配線するため、コンシューマー側での
   * ハンドラ実装は不要。ただし `loginFormComponent` / `registerFormComponent` を
   * カスタム差し替えした場合は `providers` と `loginWithSocial` を自力で渡す。
   */
  providers?: readonly SocialProvider[];
  /** fetch 実装の注入。テストで MSW を差し込むときなどに使用。 */
  fetch?: typeof fetch;
  /** silent refresh のタイマーを無効化する。テスト・SSR 検証で使うことがある。 */
  disableSilentRefresh?: boolean;
  /** bootstrap 実行中に描画されるプレースホルダー。 */
  loadingFallback?: ReactNode;
  /** 組み込みの `MFAChallenge` を差し替える。 */
  mfaChallengeComponent?: ComponentType<MFAChallengeProps>;
  /** 組み込みの `MFASetupWizard` を差し替える。 */
  mfaSetupComponent?: ComponentType<MFASetupWizardProps>;
  /** 組み込みの `LoginForm` を差し替える。差し替え時は `providers` の配線も自前で行う。 */
  loginFormComponent?: ComponentType<LoginFormProps>;
  /** 組み込みの `RegisterForm` を差し替える。差し替え時は `providers` の配線も自前で行う。 */
  registerFormComponent?: ComponentType<RegisterFormProps>;
  /**
   * 組み込みの `SocialSignupPublicIdForm` を差し替える。ソーシャル経由で初回
   * サインアップしたユーザーに対して公開 ID を設定させる UI をカスタマイズする。
   */
  socialSignupComponent?: ComponentType<SocialSignupPublicIdFormProps>;
  /**
   * MFA セットアップ時に authenticator アプリへ表示される発行元名。
   * `<MFASetupWizard>` がクライアント側で組み立てる `otpauth://` URI の
   * `issuer` ラベルに使われ、Google Authenticator などで「Fuju (alice@example.com)」
   * のように表示される。未指定なら `'Fuju'`。
   */
  mfaIssuer?: string;
  /**
   * bootstrap / refresh / 401 ハンドリングなどの内部イベントを受け取る診断フック。
   * 未指定なら何も通知しない。主にリロード直後のログアウト問題など、サーバー側の
   * Cookie 設定とフロントの挙動を突き合わせるための観測点として使う。`console.log`
   * に流して Network タブの `Set-Cookie` と突き合わせる用途を想定しているため、
   * 副作用の無い軽い実装が望ましい。
   */
  onDiagnostic?: (event: AuthDiagnosticEvent) => void;
}
