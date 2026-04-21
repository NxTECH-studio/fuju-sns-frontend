import type { FujuClient } from '../client';
import type { PostListResponse, ULID } from '../types';

export interface TimelineQuery {
  cursor?: string;
  limit?: number;
}

export function timelinesHome(
  client: FujuClient,
  q: TimelineQuery = {},
  signal?: AbortSignal,
): Promise<PostListResponse> {
  return client.get<PostListResponse>('/timeline/home', {
    signal,
    query: { cursor: q.cursor, limit: q.limit },
  });
}

export function timelinesGlobal(
  client: FujuClient,
  q: TimelineQuery = {},
  signal?: AbortSignal,
): Promise<PostListResponse> {
  return client.get<PostListResponse>('/timeline/global', {
    signal,
    query: { cursor: q.cursor, limit: q.limit },
  });
}

export function timelinesUser(
  client: FujuClient,
  sub: ULID,
  q: TimelineQuery = {},
  signal?: AbortSignal,
): Promise<PostListResponse> {
  return client.get<PostListResponse>(`/timeline/user/${encodeURIComponent(sub)}`, {
    signal,
    query: { cursor: q.cursor, limit: q.limit },
  });
}
