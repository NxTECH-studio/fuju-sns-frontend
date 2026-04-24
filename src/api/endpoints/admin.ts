import type { FujuClient } from "../client";
import type {
  BadgeEnvelope,
  BadgeListEnvelope,
  CreateBadgeRequest,
  GrantBadgeEnvelope,
  GrantBadgeRequest,
  ULID,
  UpdateBadgeRequest,
} from "../types";

export function adminBadgesList(
  client: FujuClient,
  signal?: AbortSignal
): Promise<BadgeListEnvelope> {
  return client.get<BadgeListEnvelope>("/v1/admin/badges", { signal });
}

export function adminBadgesCreate(
  client: FujuClient,
  input: CreateBadgeRequest,
  signal?: AbortSignal
): Promise<BadgeEnvelope> {
  return client.post<BadgeEnvelope>("/v1/admin/badges", input, { signal });
}

export function adminBadgesUpdate(
  client: FujuClient,
  id: ULID,
  input: UpdateBadgeRequest,
  signal?: AbortSignal
): Promise<BadgeEnvelope> {
  return client.put<BadgeEnvelope>(
    `/v1/admin/badges/${encodeURIComponent(id)}`,
    input,
    {
      signal,
    }
  );
}

export function adminBadgesGrant(
  client: FujuClient,
  sub: ULID,
  input: GrantBadgeRequest,
  signal?: AbortSignal
): Promise<GrantBadgeEnvelope> {
  return client.post<GrantBadgeEnvelope>(
    `/v1/admin/users/${encodeURIComponent(sub)}/badges`,
    input,
    { signal }
  );
}

export function adminBadgesRevoke(
  client: FujuClient,
  sub: ULID,
  badgeId: ULID,
  signal?: AbortSignal
): Promise<void> {
  return client.del(
    `/v1/admin/users/${encodeURIComponent(sub)}/badges/${encodeURIComponent(
      badgeId
    )}`,
    { signal }
  );
}
