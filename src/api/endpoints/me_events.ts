import type { FujuClient } from "../client";
import type { MeEventsBatch, MeEventsResponse } from "../types";

// POST /v1/me/events — forwards a batch of frontend telemetry events
// (view_start / view_end / scroll_stop / rewind) to the SNS backend,
// which fans them out to fuju-emotion-model.
//
// Authenticated route. The backend overrides user_id with the caller's
// sub, so the frontend never sends one.
export function postMeEvents(
  client: FujuClient,
  body: MeEventsBatch,
  signal?: AbortSignal
): Promise<MeEventsResponse> {
  return client.post<MeEventsResponse>("/v1/me/events", body, { signal });
}
