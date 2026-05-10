import { useCallback, useEffect, useRef, useState } from "react";
import { isAbortError } from "../api/error";

export interface AbortableResourceState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
  setData: (updater: (prev: T | null) => T | null) => void;
}

interface Options<T> {
  fetcher: (signal: AbortSignal) => Promise<T>;
  // Dependencies that key the fetch. When they change, the in-flight
  // request is aborted and a fresh fetch runs. MUST include everything
  // the fetcher closure captures, or the hook will serve stale data.
  deps: ReadonlyArray<unknown>;
  // When true, keeps the previous `data` visible during a reload instead
  // of flashing back to `null`. Use only when the deps change does not
  // alter the meaning of T (e.g. paginating the same collection).
  keepDataWhileReloading?: boolean;
}

// Generic abortable resource: single-shot fetch keyed by `deps` with a
// reload trigger. Consolidates the AbortController + tick + isAbortError
// boilerplate that would otherwise be repeated across every resource hook.
//
// The fetcher is read through a ref so the effect dep array can stay
// limited to `deps` (+ tick). Callers must list everything the fetcher
// closes over in `deps`; the fetcher reference itself does not need to
// be stable.
export function useAbortableResource<T>({
  fetcher,
  deps,
  keepDataWhileReloading = false,
}: Options<T>): AbortableResourceState<T> {
  const [data, setDataState] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const ctrlRef = useRef<AbortController | null>(null);
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    /* eslint-disable react-hooks/set-state-in-effect -- intentional reset before async refetch when deps change */
    setLoading(true);
    setError(null);
    if (!keepDataWhileReloading) setDataState(null);
    /* eslint-enable react-hooks/set-state-in-effect */

    fetcherRef
      .current(ctrl.signal)
      .then((value) => {
        if (ctrl.signal.aborted) return;
        setDataState(value);
        setLoading(false);
      })
      .catch((e) => {
        if (isAbortError(e) || ctrl.signal.aborted) return;
        setError(e instanceof Error ? e.message : "unknown error");
        setLoading(false);
      });

    return () => {
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick, keepDataWhileReloading]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const setData = useCallback(
    (updater: (prev: T | null) => T | null) =>
      setDataState((prev) => updater(prev)),
    []
  );

  return { data, loading, error, reload, setData };
}
