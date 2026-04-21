import { useCallback } from "react";
import { useAuthContext } from "../auth-component/src/AuthProvider";

// Returns a stable getter for the latest AuthCore access token.
// The reference is memoized so consumers (e.g. FujuClient factory) do not
// re-create every render, which would cascade through every hook that
// keys on `client` in its deps.
export function useAuthToken(): () => string | null {
  const { store } = useAuthContext();
  return useCallback(() => {
    const token = store.getAuthToken();
    return token === "" ? null : token;
  }, [store]);
}
