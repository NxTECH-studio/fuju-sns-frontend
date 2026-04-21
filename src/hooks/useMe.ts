import { useMeContext, type MeState } from '../state/meContext';

export function useMe(): MeState & { refresh: () => Promise<void> } {
  const { state, refresh } = useMeContext();
  return { ...state, refresh } as MeState & { refresh: () => Promise<void> };
}
