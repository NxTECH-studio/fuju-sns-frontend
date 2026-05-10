import { useEffect } from "react";
import { useNavigate } from "react-router";
import { AuthGuard, useAuthStatus } from "../auth-component";
import { EmptyState } from "../ui/components/EmptyState";

export function LoginRoute() {
  const navigate = useNavigate();
  const { status } = useAuthStatus();

  useEffect(() => {
    if (status === "authenticated") {
      navigate("/", { replace: true });
    }
  }, [status, navigate]);

  return (
    <AuthGuard>
      <EmptyState title="ログイン済み" description="Home に移動します..." />
    </AuthGuard>
  );
}
