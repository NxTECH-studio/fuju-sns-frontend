import { AuthGuard, AuthProvider } from "fuju-auth-react";
import { FujuClientProvider } from "./state/FujuClientProvider";
import { MeProvider } from "./state/MeProvider";
import { TelemetryProvider } from "./state/TelemetryProvider";
import { ToastProvider } from "./state/ToastProvider";
import { AppRoutes } from "./routes/router";
import { EmptyState } from "./ui/components/EmptyState";
import { AuthTokenBridge } from "./hooks/useAuthToken";

export function AppRoot() {
  const API_BASE = import.meta.env.VITE_AUTH_CORE_BASE_URL;
  return (
    <AuthProvider
      config={{
        baseURL: API_BASE,
        loadingFallback: <EmptyState title="読み込み中..." />,
      }}
    >
      <AuthTokenBridge />
      <FujuClientProvider>
        <MeProvider>
          <TelemetryProvider>
            <ToastProvider>
              {/*
                Top-level AuthGuard with required=false lets public routes
                (/global, /posts/:id, /users/:sub, ...) render while still
                letting AuthGuard own MFA setup / social signup public-ID
                / MFA challenge flows for authenticated users. The /login
                route wraps its children with a second <AuthGuard> (default
                required=true) to surface LoginForm on demand.

                `onUnauthenticatedNavigate` is intentionally NOT configured
                here: with it set, the inner AuthGuard on /login would call
                navigate('/login') into itself and then render loadingFallback
                instead of the LoginForm. Authenticated-required routes show
                their own "ログインが必要です" prompt that links to /login.
              */}
              <AuthGuard required={false}>
                <AppRoutes />
              </AuthGuard>
            </ToastProvider>
          </TelemetryProvider>
        </MeProvider>
      </FujuClientProvider>
    </AuthProvider>
  );
}
