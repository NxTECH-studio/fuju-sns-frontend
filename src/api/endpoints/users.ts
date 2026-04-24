import type { FujuClient } from "../client";
import type {
  PublicUserEnvelope,
  SelfUserEnvelope,
  ULID,
  UpdateUserProfileRequest,
  UserListResponse,
} from "../types";

export function getUser(
  client: FujuClient,
  sub: ULID,
  signal?: AbortSignal
): Promise<PublicUserEnvelope> {
  return client.get<PublicUserEnvelope>(`/users/${encodeURIComponent(sub)}`, {
    signal,
  });
}

export function listUsers(
  client: FujuClient,
  q: { limit?: number; offset?: number } = {},
  signal?: AbortSignal
): Promise<UserListResponse> {
  return client.get<UserListResponse>("/users", {
    signal,
    query: { limit: q.limit, offset: q.offset },
  });
}

export function updateUser(
  client: FujuClient,
  sub: ULID,
  input: UpdateUserProfileRequest,
  signal?: AbortSignal
): Promise<SelfUserEnvelope> {
  return client.put<SelfUserEnvelope>(
    `/users/${encodeURIComponent(sub)}`,
    input,
    { signal }
  );
}
