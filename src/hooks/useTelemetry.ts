import { useContext } from "react";
import { TelemetryContext } from "../state/telemetryContext";
import type { TelemetrySink, TelemetryInput } from "../services/telemetry";

const noop: TelemetrySink = {
  enqueue() {},
  async flush() {},
  async shutdown() {},
};

/**
 * Returns the current TelemetrySink, or a no-op when no provider is
 * mounted (public / pre-auth pages). Callers can always
 * `telemetry.enqueue(...)` without null-checking.
 */
export function useTelemetry(): TelemetrySink {
  return useContext(TelemetryContext) ?? noop;
}

export type { TelemetryInput };
