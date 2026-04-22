import type { MeVM } from "../types/vm";
import { useMe } from "./useMe";

// Returns the current MeVM only when MeProvider is in the `ready` state,
// otherwise null. Thin derivative on top of useMe() for the common
// "just give me the signed-in user or nothing" usage.
export function useMeReady(): MeVM | null {
  const me = useMe();
  return me.status === "ready" ? me.me : null;
}
