import { createContext, useContext } from "react";
import type { MeVM } from "../types/vm";

export type MeState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; me: MeVM }
  | { status: "unauthenticated" }
  | { status: "error"; message: string };

export interface MeContextValue {
  state: MeState;
  refresh: () => Promise<void>;
}

export const MeContext = createContext<MeContextValue | null>(null);

export function useMeContext(): MeContextValue {
  const v = useContext(MeContext);
  if (!v) throw new Error("MeProvider is missing.");
  return v;
}
