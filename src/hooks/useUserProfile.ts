import { useCallback } from "react";
import { getUser } from "../api/endpoints/users";
import { toUserVM } from "../services/mappers";
import type { UserVM } from "../types/vm";
import { useFujuClient } from "./useFujuClient";
import { useAbortableResource } from "./useAbortableResource";

export interface UserProfileState {
  user: UserVM | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  setUser: (next: UserVM) => void;
}

export function useUserProfile(sub: string | null): UserProfileState {
  const client = useFujuClient();

  const fetcher = useCallback(
    async (signal: AbortSignal): Promise<UserVM | null> => {
      if (!sub) return null;
      const res = await getUser(client, sub, signal);
      return toUserVM(res.data);
    },
    [client, sub]
  );

  const resource = useAbortableResource<UserVM | null>({
    fetcher,
    deps: [client, sub],
  });

  const setUser = useCallback(
    (next: UserVM) => {
      resource.setData(() => next);
    },
    [resource]
  );

  return {
    user: resource.data,
    loading: resource.loading,
    error: resource.error,
    refresh: resource.reload,
    setUser,
  };
}
