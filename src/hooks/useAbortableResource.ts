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
  deps: ReadonlyArray<unknown>;
  // When true, keeps the previous `data` visible during a reload instead
  // of flashing back to `null`. Useful for pagination-like reloads.
  keepDataWhileReloading?: boolean;
}

// Generic abortable resource: single-shot fetch keyed by `deps` with a
// reload trigger. Consolidates the AbortController + tick + isAbortError
// boilerplate that would otherwise be repeated across every resource hook.
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

  useEffect(() => {
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    setLoading(true);
    setError(null);
    if (!keepDataWhileReloading) setDataState(null);

    fetcher(ctrl.signal)
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
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const setData = useCallback(
    (updater: (prev: T | null) => T | null) =>
      setDataState((prev) => updater(prev)),
    []
  );

  return { data, loading, error, reload, setData };
}
