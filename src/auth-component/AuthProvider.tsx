import {
  type ReactNode,
  createContext,
  type ReactElement,
  useState,
  useEffect,
  useMemo,
  useContext,
} from 'react';

import { AuthStore } from './store/AuthStore';
import type { AuthConfig } from './types';

export interface AuthProviderProps {
  config: AuthConfig;
  children: ReactNode;
}

interface AuthContextValue {
  store: AuthStore;
  config: AuthConfig;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider(props: Readonly<AuthProviderProps>): ReactElement {
  const { config, children } = props;
  const [store, setStore] = useState<AuthStore | null>(null);

  useEffect(() => {
    const instance = new AuthStore(config);
    setStore(instance);
    void instance.bootstrap();
    return () => {
      instance.dispose();
    };
    // Store is created once on mount; later config changes are ignored,
    // matching the prior useState-initializer behavior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthContextValue | null>(
    () => (store ? { store, config } : null),
    [store, config],
  );

  if (!value) {
    return <>{config.loadingFallback ?? null}</>;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('AuthProvider is missing. Wrap your tree with <AuthProvider config={...}>.');
  }
  return ctx;
}
