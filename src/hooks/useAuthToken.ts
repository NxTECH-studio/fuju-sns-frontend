import { createElement, useEffect, type ReactElement } from "react";
import { useAuth, useAuthStatus } from "../auth-component";

let currentToken: string | null = null;

function AuthTokenSync(): null {
  const { authToken } = useAuth();
  useEffect(() => {
    currentToken = authToken === "" ? null : authToken;
  }, [authToken]);
  return null;
}

// Rendered near the app root so the live AuthCore access token is mirrored to
// a module-local holder. `useAuth()` throws outside an authenticated snapshot,
// so the inner hook component is only mounted when status === 'authenticated'.
// This keeps `useAuthToken()` a stable getter that any provider (including
// ones above <AuthGuard>) can consume without re-creating the FujuClient per
// token refresh.
export function AuthTokenBridge(): ReactElement | null {
  const { status } = useAuthStatus();
  useEffect(() => {
    if (status !== "authenticated") {
      currentToken = null;
    }
  }, [status]);
  if (status !== "authenticated") return null;
  return createElement(AuthTokenSync);
}

export function useAuthToken(): () => string | null {
  return () => currentToken;
}
