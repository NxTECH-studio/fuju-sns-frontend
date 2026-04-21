import { useMemo, type ReactNode } from 'react';
import { createFujuClient, type FujuClient } from '../api/client';
import { useAuthToken } from '../hooks/useAuthToken';
import { FujuClientContext } from './fujuClientContext';

const DEFAULT_BASE_URL = 'http://localhost:8080';

function resolveBaseURL(): string {
  const fromEnv = import.meta.env.VITE_FUJU_API_BASE_URL;
  return typeof fromEnv === 'string' && fromEnv !== '' ? fromEnv : DEFAULT_BASE_URL;
}

export function FujuClientProvider({ children }: { children: ReactNode }) {
  const getToken = useAuthToken();

  const client = useMemo<FujuClient>(
    () =>
      createFujuClient({
        baseURL: resolveBaseURL(),
        getToken,
      }),
    [getToken],
  );

  return <FujuClientContext.Provider value={client}>{children}</FujuClientContext.Provider>;
}
