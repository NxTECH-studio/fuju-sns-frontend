import { useCallback } from 'react';
import {
  timelinesGlobal,
  timelinesHome,
  timelinesUser,
} from '../api/endpoints/timelines';
import { toPostVM } from '../services/mappers';
import type { PostVM } from '../services/vm';
import { usePagedList, type PagedListState } from './usePagedList';
import { useFujuClient } from './useFujuClient';

export type TimelineKind = 'home' | 'global' | 'user';

export function useTimeline(kind: TimelineKind, userSub?: string): PagedListState<PostVM> {
  const client = useFujuClient();

  const fetchPage = useCallback(
    async (cursor: string | undefined, signal: AbortSignal) => {
      const q = { cursor, limit: 20 };
      let res;
      if (kind === 'home') res = await timelinesHome(client, q, signal);
      else if (kind === 'global') res = await timelinesGlobal(client, q, signal);
      else {
        if (!userSub) throw new Error('userSub is required for user timeline');
        res = await timelinesUser(client, userSub, q, signal);
      }
      return {
        items: res.data.map(toPostVM),
        nextCursor: res.next_cursor,
      };
    },
    [client, kind, userSub],
  );

  return usePagedList<PostVM>({ fetchPage, deps: [client, kind, userSub] });
}
