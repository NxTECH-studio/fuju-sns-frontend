import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuthStatus } from "../auth-component/src";
import { meGet } from "../api/endpoints/me";
import { isAbortError, isFujuApiError } from "../api/error";
import { toMeVM } from "../services/mappers";
import { useFujuClient } from "../hooks/useFujuClient";
import { MeContext, type MeContextValue, type MeState } from "./meContext";

export function MeProvider({ children }: { children: ReactNode }) {
  const { status: authStatus } = useAuthStatus();
  const client = useFujuClient();
  const [state, setState] = useState<MeState>({ status: "idle" });
  const loadingRef = useRef<AbortController | null>(null);

  const fetchMe = useCallback(async (): Promise<void> => {
    loadingRef.current?.abort();
    const ctrl = new AbortController();
    loadingRef.current = ctrl;
    setState({ status: "loading" });
    try {
      const res = await meGet(client, ctrl.signal);
      if (ctrl.signal.aborted) return;
      setState({ status: "ready", me: toMeVM(res.data) });
    } catch (e) {
      if (isAbortError(e) || ctrl.signal.aborted) return;
      if (isFujuApiError(e) && (e.status === 401 || e.status === 403)) {
        setState({ status: "unauthenticated" });
        return;
      }
      const msg = e instanceof Error ? e.message : "unknown error";
      setState({ status: "error", message: msg });
    }
  }, [client]);

  useEffect(() => {
    if (authStatus === "authenticated") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void fetchMe();
    } else if (authStatus === "unauthenticated") {
      loadingRef.current?.abort();
      setState({ status: "unauthenticated" });
    } else if (authStatus === "idle" || authStatus === "authenticating") {
      setState({ status: "idle" });
    }
    return () => {
      loadingRef.current?.abort();
    };
  }, [authStatus, fetchMe]);

  const value = useMemo<MeContextValue>(
    () => ({ state, refresh: fetchMe }),
    [state, fetchMe]
  );

  return <MeContext.Provider value={value}>{children}</MeContext.Provider>;
}
