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
  /** Mark whether an end-user is signed in. The wire payload no
   *  longer carries user_id (the model derives it from the Bearer's
   *  ``sub``); this flag only gates flushes — anonymous events stay
   *  queued until sign-in to avoid 401s against the model. */
  setSignedIn(signedIn: boolean): void;
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
  tenantId: string;
  /** Whether the end-user is signed in initially. TelemetryProvider
   *  keeps it in sync via setSignedIn() on auth state changes.
   *  Anonymous mounts buffer events until sign-in. */
  initialSignedIn?: boolean;
  /** Hook for tests + visibility-driven flush. Defaults to a 5s tick. */
  setIntervalImpl?: (cb: () => void, ms: number) => number;
  clearIntervalImpl?: (handle: number) => void;
  /** Defaults to performance.now() but tests want fake clocks. */
  nowIso?: () => string;
}

interface PendingEvent {
  itemId: string;
  eventType: FrontendEventType;
  timestamp: string;
  durationSeconds?: number;
  positionSeconds?: number;
  metadata?: Record<string, unknown>;
}

class TelemetryBatcher implements TelemetrySink {
  private queue: PendingEvent[] = [];
  private timer: number | null = null;
  private flushing = false;
  private done = false;
  private signedIn: boolean;

  constructor(private readonly deps: BatcherDeps) {
    this.signedIn = deps.initialSignedIn ?? false;
    const setI = deps.setIntervalImpl ?? window.setInterval.bind(window);
    this.timer = setI(() => {
      void this.flush();
    }, FLUSH_INTERVAL_MS);
  }

  setSignedIn(signedIn: boolean): void {
    this.signedIn = signedIn;
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
      itemId: event.itemId,
      eventType: event.eventType,
      timestamp: this.deps.nowIso?.() ?? new Date().toISOString(),
      durationSeconds: event.durationSeconds,
      positionSeconds: event.positionSeconds,
      metadata: event.metadata,
    });
    if (this.queue.length >= BATCH_SIZE) {
      void this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.flushing) return;
    if (this.queue.length === 0) return;
    if (!this.signedIn) {
      // No authenticated user yet — leave events queued so they
      // ship on the next flush after sign-in. The impression-tracker
      // keeps running on public routes (/global, /posts/:id), so
      // events accumulate during anonymous browsing; QUEUE_CAP bounds
      // memory while we wait for auth. The model's middleware would
      // 401 anonymous POSTs, so guarding here saves wasted requests.
      return;
    }
    this.flushing = true;
    const drained = this.queue.splice(0, this.queue.length);
    // Wire payload no longer carries user_id; the fuju ingestion
    // handler stamps the introspected sub server-side for end-user
    // tokens. This closes the spoofing loophole the placeholder field
    // implied (a malicious client could set any user_id).
    const events: MeEventInput[] = drained.map((e) => ({
      item_id: e.itemId,
      event_type: e.eventType,
      timestamp: e.timestamp,
      duration_seconds: e.durationSeconds,
      position_seconds: e.positionSeconds,
      metadata: e.metadata,
    }));
    try {
      await postMeEvents(this.deps.client, this.deps.tenantId, { events });
    } catch (e) {
      // Telemetry is best-effort. Network failures are logged but
      // intentionally NOT re-queued — a sustained outage would just
      // amplify retries while the user keeps scrolling. The model's
      // own daily reconciliation absorbs the gap.
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
