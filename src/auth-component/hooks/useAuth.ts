import { useSyncExternalStore, useMemo } from 'react';

import { useAuthContext } from '../AuthProvider';
import type { MFASetupResult, SocialProvider, User } from '../types';

export interface AuthContextAuthenticated {
  status: 'authenticated';
  user: User;
  authToken: string | null;

  logout: () => Promise<void>;

  refreshProfile: () => Promise<User>;
  updatePublicID: (next: string) => Promise<User>;
  updateIcon: (file: File) => Promise<User>;

  setupMFA: () => Promise<MFASetupResult>;
  enableMFA: (code: string) => Promise<User>;
  disableMFA: (code: string) => Promise<User>;

  connectSocial: (provider: SocialProvider) => void;
  disconnectSocial: (provider: SocialProvider) => Promise<User>;
}

export function useAuth(): AuthContextAuthenticated {
  const { store } = useAuthContext();
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  if (snapshot.status !== 'authenticated' || !snapshot.user) {
    throw new Error(
      'useAuth() may only be called inside <AuthGuard>. For general status use useAuthStatus().',
    );
  }

  const user = snapshot.user;

  return useMemo<AuthContextAuthenticated>(
    () => ({
      status: 'authenticated',
      user,
      authToken: store.getAuthToken(),
      logout: () => store.logout(),
      refreshProfile: () => store.refreshProfile(),
      updatePublicID: (next) => store.updatePublicID(next),
      updateIcon: (file) => store.updateIcon(file),
      setupMFA: () => store.setupMFA(),
      enableMFA: (code) => store.enableMFA(code),
      disableMFA: (code) => store.disableMFA(code),
      connectSocial: (provider) => store.connectSocial(provider),
      disconnectSocial: (provider) => store.disconnectSocial(provider),
    }),
    [store, user],
  );
}
