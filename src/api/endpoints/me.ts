import type { FujuClient } from '../client';
import type { SelfUserEnvelope } from '../types';

export function meGet(client: FujuClient, signal?: AbortSignal): Promise<SelfUserEnvelope> {
  return client.get<SelfUserEnvelope>('/me', { signal });
}
