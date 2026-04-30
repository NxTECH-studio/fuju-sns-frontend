import { useCallback, useEffect, useRef } from "react";
import { useTelemetry } from "./useTelemetry";

// Thresholds (RFC-LT-003 / docs/sns_log_contract.md §5):
//
//   * view_start fires when ≥VIEW_THRESHOLD_RATIO of the card has
//     been continuously on-screen for ≥VIEW_DWELL_MS. This ignores
//     incidental scroll-throughs.
//   * view_end fires when the card leaves the viewport (or unmounts)
//     AFTER a view_start. The reported duration_seconds is the
//     wall-clock interval between view_start and view_end. We do not
//     pause when the tab is backgrounded — the visibilitychange flush
//     in TelemetryProvider catches that gap separately.
//   * scroll_stop fires for shorter dwells (SCROLL_STOP_DWELL_MS) at
//     a lower visibility threshold; "this card caught the user's eye
//     but didn't trigger a play". Won't fire if a view_start already
//     did for this mount.
//   * Re-entry after a view_end starts a fresh cycle.
//
// IntersectionObserver is created once per (root, threshold) tuple
// inside this hook instance via a ref; React 19's strict-mode double
// invocation of the cleanup is fine because we always tear down on
// the cleanup branch.

const VIEW_THRESHOLD_RATIO = 0.5;
const VIEW_DWELL_MS = 1_000;
const SCROLL_STOP_DWELL_MS = 500;
const SCROLL_STOP_RATIO = 0.25;

type Phase = "idle" | "scroll_stop_pending" | "view_pending" | "viewing";

interface TrackerState {
  phase: Phase;
  viewStartedAt: number | null;
  scrollStopTimer: number | null;
  viewStartTimer: number | null;
  scrollStopFired: boolean;
}

/**
 * Returns a callback ref to attach to a list-item DOM node. The hook
 * starts an IntersectionObserver on the first attached node and
 * tears it down on unmount or item-id change. Each item maintains
 * its own dwell-timer state so a viewport with many cards tracks
 * them independently.
 *
 * Usage:
 *
 *   const ref = useImpressionTracker(post.id);
 *   return <article ref={ref}>...</article>;
 */
export function useImpressionTracker(
  itemId: string
): (node: Element | null) => void {
  const telemetry = useTelemetry();
  const stateRef = useRef<TrackerState>({
    phase: "idle",
    viewStartedAt: null,
    scrollStopTimer: null,
    viewStartTimer: null,
    scrollStopFired: false,
  });
  const observerRef = useRef<IntersectionObserver | null>(null);
  const currentNodeRef = useRef<Element | null>(null);
  // Stable refs for non-render-cycle dependencies (telemetry is created
  // once by the provider; itemId can change if the parent re-uses the
  // same DOM node for a different post). Sync via effect so we never
  // mutate refs during render.
  const itemIdRef = useRef(itemId);
  const telemetryRef = useRef(telemetry);
  useEffect(() => {
    itemIdRef.current = itemId;
  }, [itemId]);
  useEffect(() => {
    telemetryRef.current = telemetry;
  }, [telemetry]);

  const fireViewEnd = useCallback(() => {
    const s = stateRef.current;
    if (s.viewStartedAt !== null) {
      const dur = (performance.now() - s.viewStartedAt) / 1000;
      telemetryRef.current.enqueue({
        itemId: itemIdRef.current,
        eventType: "view_end",
        durationSeconds: dur,
        positionSeconds: dur,
      });
    }
    if (s.viewStartTimer !== null) {
      window.clearTimeout(s.viewStartTimer);
      s.viewStartTimer = null;
    }
    if (s.scrollStopTimer !== null) {
      window.clearTimeout(s.scrollStopTimer);
      s.scrollStopTimer = null;
    }
    s.phase = "idle";
    s.viewStartedAt = null;
  }, []);

  const onIntersect = useCallback(
    (entry: IntersectionObserverEntry) => {
      const s = stateRef.current;
      const ratio = entry.intersectionRatio;

      // Card has left the viewport entirely (or below scroll-stop ratio).
      if (!entry.isIntersecting || ratio < SCROLL_STOP_RATIO) {
        if (s.phase === "viewing") {
          fireViewEnd();
        } else {
          if (s.scrollStopTimer !== null) {
            window.clearTimeout(s.scrollStopTimer);
            s.scrollStopTimer = null;
          }
          if (s.viewStartTimer !== null) {
            window.clearTimeout(s.viewStartTimer);
            s.viewStartTimer = null;
          }
          s.phase = "idle";
        }
        return;
      }

      // Visible but below the view_start threshold — schedule
      // scroll_stop unless we already fired one this mount.
      if (ratio < VIEW_THRESHOLD_RATIO) {
        if (s.phase === "viewing" || s.phase === "view_pending") {
          // Drop back to scroll-stop watchlist.
          if (s.viewStartTimer !== null) {
            window.clearTimeout(s.viewStartTimer);
            s.viewStartTimer = null;
          }
          s.phase = "idle";
        }
        if (
          !s.scrollStopFired &&
          s.scrollStopTimer === null &&
          s.phase === "idle"
        ) {
          s.phase = "scroll_stop_pending";
          s.scrollStopTimer = window.setTimeout(() => {
            if (stateRef.current.phase === "scroll_stop_pending") {
              telemetryRef.current.enqueue({
                itemId: itemIdRef.current,
                eventType: "scroll_stop",
              });
              stateRef.current.scrollStopFired = true;
              stateRef.current.phase = "idle";
              stateRef.current.scrollStopTimer = null;
            }
          }, SCROLL_STOP_DWELL_MS);
        }
        return;
      }

      // Crossed the view_start threshold.
      if (s.scrollStopTimer !== null) {
        window.clearTimeout(s.scrollStopTimer);
        s.scrollStopTimer = null;
      }
      if (s.phase === "viewing") return; // already counting

      if (s.viewStartTimer === null) {
        s.phase = "view_pending";
        s.viewStartTimer = window.setTimeout(() => {
          const ss = stateRef.current;
          if (ss.phase === "view_pending") {
            telemetryRef.current.enqueue({
              itemId: itemIdRef.current,
              eventType: "view_start",
            });
            ss.viewStartedAt = performance.now();
            ss.phase = "viewing";
            ss.viewStartTimer = null;
          }
        }, VIEW_DWELL_MS);
      }
    },
    [fireViewEnd]
  );

  // Cleanup on unmount: fire view_end if we were mid-view, drop
  // pending timers, disconnect observer. Snapshot the state ref at
  // effect-setup so the cleanup closure doesn't read a stale value.
  useEffect(() => {
    const state = stateRef.current;
    return () => {
      if (state.phase === "viewing") {
        fireViewEnd();
      } else {
        if (state.viewStartTimer !== null) {
          window.clearTimeout(state.viewStartTimer);
        }
        if (state.scrollStopTimer !== null) {
          window.clearTimeout(state.scrollStopTimer);
        }
      }
      observerRef.current?.disconnect();
      observerRef.current = null;
      currentNodeRef.current = null;
    };
  }, [fireViewEnd]);

  // Ref callback handed to the consuming component.
  return useCallback(
    (node: Element | null) => {
      // Detach from any previous node (item id change keeps the same
      // hook instance but the JSX may swap which DOM node it owns).
      if (observerRef.current && currentNodeRef.current) {
        observerRef.current.unobserve(currentNodeRef.current);
      }
      currentNodeRef.current = node;
      if (!node) return;

      if (!observerRef.current) {
        // Multiple thresholds so we receive ratio updates at both
        // bands (scroll-stop and view-start).
        observerRef.current = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              onIntersect(entry);
            }
          },
          {
            threshold: [SCROLL_STOP_RATIO, VIEW_THRESHOLD_RATIO],
          }
        );
      }
      observerRef.current.observe(node);
    },
    [onIntersect]
  );
}
