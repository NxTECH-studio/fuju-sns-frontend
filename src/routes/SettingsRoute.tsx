import { Outlet, useLocation, useNavigate } from "react-router";
import { useMe } from "../hooks/useMe";
import { EmptyState } from "../ui/components/EmptyState";
import { ErrorMessage } from "../ui/components/ErrorMessage";
import {
  SettingsNav,
  type SettingsNavItem,
} from "../ui/components/SettingsNav";
import { Button } from "../ui/primitives/Button";
import styles from "./Settings.module.css";

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

  const items: SettingsNavItem[] = [
    {
      to: "/settings/profile",
      label: "プロフィール",
      active: location.pathname.startsWith("/settings/profile"),
    },
  ];

  return (
    <div className={styles.layout}>
      <SettingsNav items={items} onNavigate={(to) => navigate(to)} />
      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  );
}
