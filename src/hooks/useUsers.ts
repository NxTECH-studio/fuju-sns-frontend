import { useCallback } from "react";
import { listUsers } from "../api/endpoints/users";
import { toUserVM } from "../services/mappers";
import type { UserVM } from "../types/vm";
import { useFujuClient } from "./useFujuClient";
import { useAbortableResource } from "./useAbortableResource";

interface UsersPage {
  users: UserVM[];
  total: number;
  limit: number;
  offset: number;
}

export interface UseUsersState {
  users: UserVM[];
  total: number;
  limit: number;
  offset: number;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useUsers(opts: {
  limit?: number;
  offset?: number;
}): UseUsersState {
  const client = useFujuClient();
  const limit = opts.limit ?? 20;
  const offset = opts.offset ?? 0;

  const fetcher = useCallback(
    async (signal: AbortSignal): Promise<UsersPage> => {
      const res = await listUsers(client, { limit, offset }, signal);
      return {
        users: res.data.map(toUserVM),
        total: res.total,
        limit: res.limit,
        offset: res.offset,
      };
    },
    [client, limit, offset]
  );

  const resource = useAbortableResource<UsersPage>({
    fetcher,
    deps: [client, limit, offset],
    keepDataWhileReloading: true,
  });

  return {
    users: resource.data?.users ?? [],
    total: resource.data?.total ?? 0,
    limit: resource.data?.limit ?? limit,
    offset: resource.data?.offset ?? offset,
    loading: resource.loading,
    error: resource.error,
    reload: resource.reload,
  };
}
