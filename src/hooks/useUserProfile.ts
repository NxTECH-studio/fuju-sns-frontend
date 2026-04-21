import { useCallback, useEffect, useRef, useState } from 'react';
import { getUser } from '../api/endpoints/users';
import { isAbortError } from '../api/error';
import { toUserVM } from '../services/mappers';
import type { UserVM } from '../services/vm';
import { useFujuClient } from './useFujuClient';

export interface UserProfileState {
  user: UserVM | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  setUser: (next: UserVM) => void;
}

export function useUserProfile(sub: string | null): UserProfileState {
  const client = useFujuClient();
  const [user, setUser] = useState<UserVM | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const ctrlRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!sub) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser(null);
      setLoading(false);
      return;
    }
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    setLoading(true);
    setError(null);

    getUser(client, sub, ctrl.signal)
      .then((res) => {
        if (ctrl.signal.aborted) return;
        setUser(toUserVM(res.data));
        setLoading(false);
      })
      .catch((e) => {
        if (isAbortError(e) || ctrl.signal.aborted) return;
        setError(e instanceof Error ? e.message : 'unknown error');
        setLoading(false);
      });

    return () => {
      ctrl.abort();
    };
  }, [client, sub, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return { user, loading, error, refresh, setUser };
}
