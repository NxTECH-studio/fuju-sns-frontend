import { createContext } from "react";
import type { FujuClient } from "../api/client";

export interface FujuModelClientValue {
  client: FujuClient;
  tenantId: string;
}

export const FujuModelClientContext =
  createContext<FujuModelClientValue | null>(null);
