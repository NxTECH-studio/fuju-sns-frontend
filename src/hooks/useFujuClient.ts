import { useContext } from 'react';
import { FujuClientContext } from '../state/fujuClientContext';
import type { FujuClient } from '../api/client';

export function useFujuClient(): FujuClient {
  const client = useContext(FujuClientContext);
  if (!client) {
    throw new Error('FujuClientProvider is missing. Wrap your tree with <FujuClientProvider>.');
  }
  return client;
}
