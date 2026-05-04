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
// the end-user AuthCore Bearer. The wire payload no longer carries
// user_id — the model's introspection middleware stamps the caller's
// ``sub`` server-side (see fuju-emotion-model
// ``api/ingestion_app.post_events``). The provider only tells the
// batcher whether a user is signed in, so anonymous mounts buffer
// events instead of firing 401s.
export function TelemetryProvider({ children }: { children: ReactNode }) {
  const { client, tenantId } = useFujuModelClient();
  const me = useMe();
  const signedIn = me.status === "ready";

  const batcher = useMemo(
    () =>
      createTelemetryBatcher({
        client,
        tenantId,
      }),
    [client, tenantId]
  );

  useEffect(() => {
    batcher.setSignedIn(signedIn);
  }, [batcher, signedIn]);

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
