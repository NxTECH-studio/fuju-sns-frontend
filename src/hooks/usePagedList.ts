import { useCallback, useEffect, useRef, useState } from 'react';
import { isAbortError } from '../api/error';

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface PagedListState<T> {
  items: T[];
  nextCursor: string | null;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  reload: () => void;
  loadMore: () => void;
  prepend: (item: T) => void;
  removeById: (pred: (item: T) => boolean) => void;
  updateById: (pred: (item: T) => boolean, next: (item: T) => T) => void;
}

interface Options<T> {
  fetchPage: (cursor: string | undefined, signal: AbortSignal) => Promise<Page<T>>;
  deps: ReadonlyArray<unknown>;
}

export function usePagedList<T>({ fetchPage, deps }: Options<T>): PagedListState<T> {
  const [items, setItems] = useState<T[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ctrlRef = useRef<AbortController | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    setItems([]);
    setNextCursor(null);
    setLoading(true);
    setError(null);

    fetchPage(undefined, ctrl.signal)
      .then((page) => {
        if (ctrl.signal.aborted) return;
        setItems(page.items);
        setNextCursor(page.nextCursor);
        setLoading(false);
      })
      .catch((e) => {
        if (isAbortError(e) || ctrl.signal.aborted) return;
        setError(e instanceof Error ? e.message : 'unknown error');
        setLoading(false);
      });

    return () => {
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  const loadMore = useCallback(() => {
    if (loading || loadingMore || !nextCursor) return;
    const ctrl = new AbortController();
    setLoadingMore(true);
    fetchPage(nextCursor, ctrl.signal)
      .then((page) => {
        if (ctrl.signal.aborted) return;
        setItems((prev) => [...prev, ...page.items]);
        setNextCursor(page.nextCursor);
        setLoadingMore(false);
      })
      .catch((e) => {
        if (isAbortError(e) || ctrl.signal.aborted) return;
        setError(e instanceof Error ? e.message : 'unknown error');
        setLoadingMore(false);
      });
  }, [fetchPage, loading, loadingMore, nextCursor]);

  const prepend = useCallback((item: T) => {
    setItems((prev) => [item, ...prev]);
  }, []);

  const removeById = useCallback((pred: (item: T) => boolean) => {
    setItems((prev) => prev.filter((x) => !pred(x)));
  }, []);

  const updateById = useCallback((pred: (item: T) => boolean, next: (item: T) => T) => {
    setItems((prev) => prev.map((x) => (pred(x) ? next(x) : x)));
  }, []);

  return {
    items,
    nextCursor,
    loading,
    loadingMore,
    error,
    reload,
    loadMore,
    prepend,
    removeById,
    updateById,
  };
}
