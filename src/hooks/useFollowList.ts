import { useCallback } from "react";
import { listFollowers, listFollowing } from "../api/endpoints/follows";
import { toUserVM } from "../services/mappers";
import type { UserVM } from "../services/vm";
import { usePagedList, type PagedListState } from "./usePagedList";
import { useFujuClient } from "./useFujuClient";

export type FollowListKind = "followers" | "following";

export function useFollowList(
  kind: FollowListKind,
  sub: string | null
): PagedListState<UserVM> {
  const client = useFujuClient();

  const fetchPage = useCallback(
    async (cursor: string | undefined, signal: AbortSignal) => {
      if (!sub) {
        return { items: [] as UserVM[], nextCursor: null };
      }
      const q = { cursor, limit: 30 };
      const res =
        kind === "followers"
          ? await listFollowers(client, sub, q, signal)
          : await listFollowing(client, sub, q, signal);
      return {
        items: res.data.map(toUserVM),
        nextCursor: res.next_cursor,
      };
    },
    [client, kind, sub]
  );

  return usePagedList<UserVM>({ fetchPage, deps: [client, kind, sub] });
}
