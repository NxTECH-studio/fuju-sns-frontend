import { useEffect, useMemo, type ReactNode } from "react";
import { TelemetryContext } from "./telemetryContext";
import { createTelemetryBatcher } from "../services/telemetry";
import { useFujuClient } from "../hooks/useFujuClient";

// Wraps the FujuClient with a TelemetryBatcher and exposes it via
// context. Mounted under FujuClientProvider in AppRoot.
//
// Lifecycle:
//   - One batcher per provider mount; remounting recreates it.
//   - On unmount we shutdown() (final flush + clear interval).
//   - Browser visibility / pagehide also trigger a synchronous flush
//     so events emitted right before tab close still ship.
//
// Authentication: postMeEvents requires a Bearer; FujuClient injects
// the cached AuthCore token automatically. If the user isn't logged
// in the request fails 401 and the failed flush is silently dropped
// (telemetry is best-effort). We don't gate the provider on auth
// status because the impression-tracking ref-callback wiring is
// agnostic — it would just never enqueue for an unauthenticated user
// since they cannot view authenticated routes anyway.
export function TelemetryProvider({ children }: { children: ReactNode }) {
  const client = useFujuClient();
  const batcher = useMemo(() => createTelemetryBatcher({ client }), [client]);

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
