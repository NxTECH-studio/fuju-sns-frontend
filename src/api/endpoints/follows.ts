import type { FujuClient } from "../client";
import type { FollowListResponse, FollowResultEnvelope, ULID } from "../types";

export function follow(
  client: FujuClient,
  sub: ULID,
  signal?: AbortSignal
): Promise<FollowResultEnvelope> {
  return client.post<FollowResultEnvelope>(
    `/users/${encodeURIComponent(sub)}/follow`,
    undefined,
    { signal }
  );
}

export function unfollow(
  client: FujuClient,
  sub: ULID,
  signal?: AbortSignal
): Promise<FollowResultEnvelope> {
  return client.del<FollowResultEnvelope>(
    `/users/${encodeURIComponent(sub)}/follow`,
    { signal }
  );
}

export function listFollowers(
  client: FujuClient,
  sub: ULID,
  q: { cursor?: string; limit?: number } = {},
  signal?: AbortSignal
): Promise<FollowListResponse> {
  return client.get<FollowListResponse>(
    `/users/${encodeURIComponent(sub)}/followers`,
    {
      signal,
      query: { cursor: q.cursor, limit: q.limit },
    }
  );
}

export function listFollowing(
  client: FujuClient,
  sub: ULID,
  q: { cursor?: string; limit?: number } = {},
  signal?: AbortSignal
): Promise<FollowListResponse> {
  return client.get<FollowListResponse>(
    `/users/${encodeURIComponent(sub)}/following`,
    {
      signal,
      query: { cursor: q.cursor, limit: q.limit },
    }
  );
}
