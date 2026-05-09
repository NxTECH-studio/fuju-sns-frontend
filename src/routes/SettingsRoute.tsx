import { Outlet, useLocation, useNavigate } from "react-router";
import { useMe } from "../hooks/useMe";
import { EmptyState } from "../ui/components/EmptyState";
import { ErrorMessage } from "../ui/components/ErrorMessage";
import {
  SettingsNav,
  type SettingsNavItem,
} from "../ui/components/SettingsNav";
import { Button } from "../ui/primitives/Button";

export function SettingsRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const me = useMe();

  if (me.status === "loading" || me.status === "idle") {
    return <p>読み込み中...</p>;
  }
  if (me.status === "unauthenticated") {
    return (
      <EmptyState
        title="ログインが必要です"
        action={
          <Button variant="primary" onClick={() => navigate("/login")}>
            ログイン
          </Button>
        }
      />
    );
  }
  if (me.status === "error") return <ErrorMessage message={me.message} />;

  const isProfileActive =
    location.pathname === "/settings" ||
    location.pathname === "/settings/" ||
    location.pathname.startsWith("/settings/profile");

  const items: SettingsNavItem[] = [
    {
      to: "/settings/profile",
      label: "プロフィール",
      active: isProfileActive,
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(180px, 220px) 1fr",
        gap: 24,
        alignItems: "start",
      }}
    >
      <SettingsNav items={items} onNavigate={(to) => navigate(to)} />
      <div style={{ minWidth: 0 }}>
        <Outlet />
      </div>
    </div>
  );
}
