import { useMeContext, type MeState } from "../state/meContext";

export type UseMeReturn = MeState & { refresh: () => Promise<void> };

export function useMe(): UseMeReturn {
  const { state, refresh } = useMeContext();
  return { ...state, refresh };
}
