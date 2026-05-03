import type { FujuClient } from "../client";
import type { MeEventsBatch, MeEventsResponse } from "../types";

// POST /v1/{tenant}/events — sends a batch of frontend telemetry events
// (view_start / view_end / scroll_stop / rewind) directly to
// fuju-emotion-model. The SNS backend is no longer in this path.
//
// Authenticated route. The end-user AuthCore Bearer is forwarded; once
// the model derives user_id from sub, the user_id field on each event
// can be dropped.
export function postMeEvents(
  client: FujuClient,
  tenantId: string,
  body: MeEventsBatch,
  signal?: AbortSignal
): Promise<MeEventsResponse> {
  return client.post<MeEventsResponse>(
    `/v1/${encodeURIComponent(tenantId)}/events`,
    body,
    { signal }
  );
}
