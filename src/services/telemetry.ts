import { postMeEvents } from "../api/endpoints/me_events";
import type { FujuClient } from "../api/client";
import type { FrontendEventType, MeEventInput } from "../api/types";

// Telemetry batching policy. Tuned for SNS scrolling UX:
//
// * BATCH_SIZE — how many events trigger an immediate flush. Keeps
//   one flush per ~one screenful of cards.
// * FLUSH_INTERVAL_MS — periodic flush even if BATCH_SIZE isn't hit,
//   so events emitted right before tab close still ship if the
//   visibilitychange flush below misses (e.g. mobile background).
// * QUEUE_CAP — drop oldest beyond this; analytics, not financial.
const BATCH_SIZE = 32;
const FLUSH_INTERVAL_MS = 5_000;
const QUEUE_CAP = BATCH_SIZE * 8;

export interface TelemetrySink {
  /** Buffer an event for the next flush. Non-blocking, no error path. */
  enqueue(event: TelemetryInput): void;
  /** Flush whatever's pending right now. Best-effort; errors swallowed. */
  flush(): Promise<void>;
  /** Stop timers + run a final flush. Idempotent. */
  shutdown(): Promise<void>;
}

/** Caller-facing payload (less verbose than MeEventInput; merges in current
 *  timestamp at enqueue time). */
export interface TelemetryInput {
  itemId: string;
  eventType: FrontendEventType;
  durationSeconds?: number;
  positionSeconds?: number;
  metadata?: Record<string, unknown>;
}

interface BatcherDeps {
  client: FujuClient;
  /** Hook for tests + visibility-driven flush. Defaults to a 5s tick. */
  setIntervalImpl?: (cb: () => void, ms: number) => number;
  clearIntervalImpl?: (handle: number) => void;
  /** Defaults to performance.now() but tests want fake clocks. */
  nowIso?: () => string;
}

class TelemetryBatcher implements TelemetrySink {
  private queue: MeEventInput[] = [];
  private timer: number | null = null;
  private flushing = false;
  private done = false;

  constructor(private readonly deps: BatcherDeps) {
    const setI = deps.setIntervalImpl ?? window.setInterval.bind(window);
    this.timer = setI(() => {
      void this.flush();
    }, FLUSH_INTERVAL_MS);
  }

  enqueue(event: TelemetryInput): void {
    if (this.done) return;
    if (this.queue.length >= QUEUE_CAP) {
      // Drop oldest. The console warning is intentional so dev tools
      // surface persistent overflow during development.
      this.queue.shift();
      console.warn("telemetry: queue full, dropped oldest event");
    }
    this.queue.push({
      item_id: event.itemId,
      event_type: event.eventType,
      timestamp: this.deps.nowIso?.() ?? new Date().toISOString(),
      duration_seconds: event.durationSeconds,
      position_seconds: event.positionSeconds,
      metadata: event.metadata,
    });
    if (this.queue.length >= BATCH_SIZE) {
      void this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.flushing) return;
    if (this.queue.length === 0) return;
    this.flushing = true;
    const drained = this.queue.splice(0, this.queue.length);
    try {
      await postMeEvents(this.deps.client, { events: drained });
    } catch (e) {
      // Telemetry is best-effort. Network failures are logged but
      // intentionally NOT re-queued — a sustained outage would just
      // amplify retries while the user keeps scrolling. The SNS
      // backend's daily fuju batch resilience absorbs the gap.
      console.warn("telemetry flush failed:", e);
    } finally {
      this.flushing = false;
    }
  }

  async shutdown(): Promise<void> {
    if (this.done) return;
    this.done = true;
    if (this.timer !== null) {
      const clear =
        this.deps.clearIntervalImpl ?? window.clearInterval.bind(window);
      clear(this.timer);
      this.timer = null;
    }
    await this.flush();
  }
}

export function createTelemetryBatcher(deps: BatcherDeps): TelemetrySink {
  return new TelemetryBatcher(deps);
}
