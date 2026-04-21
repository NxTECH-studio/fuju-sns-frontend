import { useAuthContext } from '../auth-component/src/AuthProvider';

// Returns a getter for the latest AuthCore access token.
//
// AuthStore holds `accessToken` privately and rotates it via silent refresh.
// A getter (not a snapshot) is returned so callers always see the latest value.
//
// Depends on `auth-component` exposing `getAuthToken(): string | null` on its
// AuthStore. If the method is not yet present, the getter returns null so
// public-only routes still work — authenticated calls will then fail with 401
// until the auth-component modification lands.
export function useAuthToken(): () => string | null {
  const { store } = useAuthContext();
  return () => {
    const candidate = (store as unknown as { getAuthToken?: () => string | null }).getAuthToken;
    return typeof candidate === 'function' ? candidate.call(store) : null;
  };
}
