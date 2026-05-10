import { useSyncExternalStore, useMemo } from 'react';

import { useAuthContext } from '../AuthProvider';
import type { AuthError, AuthStatus, LoginResult, SocialProvider, User } from '../types';

export type AuthContextAll =
  | { status: 'idle' | 'authenticating'; user: null }
  | { status: 'authenticated' | 'mfa_required'; user: User | null }
  | { status: 'unauthenticated' | 'error'; user: null; error?: AuthError };

export interface AuthStatusActions {
  login: (input: { identifier: string; password: string }) => Promise<LoginResult>;
  loginWithSocial: (provider: SocialProvider) => void;
  register: (input: { email: string; password: string; publicId: string }) => Promise<User>;
  logout: () => Promise<void>;
  verifyMFA: (input: { code?: string; recoveryCode?: string }) => Promise<void>;
  cancelMFA: () => void;
  completeSocialCallback: (
    provider: SocialProvider,
    params: { state: string; code: string },
  ) => Promise<User>;
  confirmSocialSignupPublicId: (publicId: string) => Promise<User>;
  skipSocialSignupPublicId: () => void;
}

export type UseAuthStatusReturn = AuthContextAll &
  AuthStatusActions & {
    mfaAttempts: number;
    needsPublicIdSetup: boolean;
  };

export function useAuthStatus(): UseAuthStatusReturn {
  const { store } = useAuthContext();
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  const actions = useMemo<AuthStatusActions>(
    () => ({
      login: (input) => store.login(input),
      loginWithSocial: (provider) => store.connectSocial(provider),
      register: (input) => store.register(input),
      logout: () => store.logout(),
      verifyMFA: (input) => store.verifyMFA(input),
      cancelMFA: () => store.cancelMFA(),
      completeSocialCallback: (provider, params) => store.completeSocialCallback(provider, params),
      confirmSocialSignupPublicId: (publicId) => store.confirmSocialSignupPublicId(publicId),
      skipSocialSignupPublicId: () => store.skipSocialSignupPublicId(),
    }),
    [store],
  );

  const base = narrow(snapshot.status, snapshot.user, snapshot.error);

  return {
    ...base,
    ...actions,
    mfaAttempts: snapshot.mfaAttempts,
    needsPublicIdSetup: snapshot.needsPublicIdSetup,
  };
}

function narrow(status: AuthStatus, user: User | null, error: AuthError | null): AuthContextAll {
  switch (status) {
    case 'idle':
    case 'authenticating':
      return { status, user: null };
    case 'authenticated':
    case 'mfa_required':
      return { status, user };
    case 'unauthenticated':
    case 'error':
      return error ? { status, user: null, error } : { status, user: null };
  }
}
