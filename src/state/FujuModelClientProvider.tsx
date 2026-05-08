import { useMemo, type ReactNode } from "react";
import { createFujuClient, type FujuClient } from "../api/client";
import { useAuthToken } from "../hooks/useAuthToken";
import {
  FujuModelClientContext,
  type FujuModelClientValue,
} from "./fujuModelClientContext";

const DEFAULT_BASE_URL = "http://localhost:9090";
const DEFAULT_TENANT_ID = "sns_a";

function resolveBaseURL(): string {
  const fromEnv = import.meta.env.VITE_FUJU_MODEL_BASE_URL;
  return typeof fromEnv === "string" && fromEnv !== ""
    ? fromEnv
    : DEFAULT_BASE_URL;
}

function resolveTenantId(): string {
  const fromEnv = import.meta.env.VITE_FUJU_MODEL_TENANT_ID;
  return typeof fromEnv === "string" && fromEnv !== ""
    ? fromEnv
    : DEFAULT_TENANT_ID;
}

// Provides a thin HTTP client pointed at fuju-emotion-model. Used only
// by TelemetryProvider for direct ingest of /v1/{tenant}/events. Bearer
// is the same end-user AuthCore token the SNS API client uses; model is
// expected to accept it and derive user_id from sub.
export function FujuModelClientProvider({ children }: { children: ReactNode }) {
  const getToken = useAuthToken();
  const tenantId = resolveTenantId();

  const value = useMemo<FujuModelClientValue>(() => {
    const client: FujuClient = createFujuClient({
      baseURL: resolveBaseURL(),
      getToken,
    });
    return { client, tenantId };
  }, [getToken, tenantId]);

  return (
    <FujuModelClientContext.Provider value={value}>
      {children}
    </FujuModelClientContext.Provider>
  );
}
