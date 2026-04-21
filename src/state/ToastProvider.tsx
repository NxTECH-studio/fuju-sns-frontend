import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ToastStack, type ToastItem } from "../ui/components/Toast";
import {
  ToastContext,
  type ToastContextValue,
  type ToastKind,
} from "./toastContext";

const TOAST_TTL_MS = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);
  const timersRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const id of timers.values()) window.clearTimeout(id);
      timers.clear();
    };
  }, []);

  const show = useCallback((message: string, kind: ToastKind = "info") => {
    counter.current += 1;
    const id = `t-${counter.current}`;
    setItems((prev) => [...prev, { id, message, kind }]);
    const timerId = window.setTimeout(() => {
      timersRef.current.delete(id);
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_TTL_MS);
    timersRef.current.set(id, timerId);
  }, []);

  const dismiss = useCallback((id: string) => {
    const t = timersRef.current.get(id);
    if (t !== undefined) {
      window.clearTimeout(t);
      timersRef.current.delete(id);
    }
    setItems((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastStack items={items} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}
