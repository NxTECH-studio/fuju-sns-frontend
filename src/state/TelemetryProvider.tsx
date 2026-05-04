import { useEffect, useMemo, type ReactNode } from "react";
import { TelemetryContext } from "./telemetryContext";
import { createTelemetryBatcher } from "../services/telemetry";
import { useFujuModelClient } from "../hooks/useFujuModelClient";
import { useMe } from "../hooks/useMe";

// Wraps the model HTTP client with a TelemetryBatcher and exposes it via
// context. Mounted under FujuModelClientProvider in AppRoot.
//
// Lifecycle:
//   - One batcher per provider mount; remounting recreates it.
//   - On unmount we shutdown() (final flush + clear interval).
//   - Browser visibility / pagehide also trigger a synchronous flush
//     so events emitted right before tab close still ship.
//
// Authentication: events are POSTed straight to fuju-emotion-model with
// the end-user AuthCore Bearer. user_id is stamped from `me.sub` and
// kept in sync via setUserId() so sign-in transitions don't recreate
// the batcher (which would lose the in-memory queue). When the caller
// is unauthenticated the batcher drops the queue on flush rather than
// emitting 401s.
export function TelemetryProvider({ children }: { children: ReactNode }) {
  const { client, tenantId } = useFujuModelClient();
  const me = useMe();
  const userId = me.status === "ready" ? me.me.sub : null;

  const batcher = useMemo(
    () =>
      createTelemetryBatcher({
        client,
        tenantId,
      }),
    [client, tenantId]
  );

  useEffect(() => {
    batcher.setUserId(userId);
  }, [batcher, userId]);

  useEffect(() => {
    const onHide = (): void => {
      void batcher.flush();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onHide);
      void batcher.shutdown();
    };
  }, [batcher]);

  return (
    <TelemetryContext.Provider value={batcher}>
      {children}
    </TelemetryContext.Provider>
  );
}
