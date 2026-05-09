import { Outlet, useLocation, useNavigate } from "react-router";
import { useAuthStatus } from "fuju-auth-react";
import {
  RootLayout,
  type HeaderUserVM,
  type NavLink,
} from "../ui/layouts/RootLayout";
import { ErrorBoundary } from "../ui/components/ErrorBoundary";
import { useMe } from "../hooks/useMe";

export function RootLayoutRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const { status, user, logout } = useAuthStatus();
  const me = useMe();

  const isAdmin = me.status === "ready" ? me.me.isAdmin : false;

  const navLinks: NavLink[] = [
    {
      to: "/",
      label: "ホーム",
      active: location.pathname === "/" || location.pathname === "/global",
    },
    {
      to: "/images",
      label: "画像",
      active: location.pathname.startsWith("/images"),
    },
    {
      to: "/settings",
      label: "設定",
      active: location.pathname.startsWith("/settings"),
    },
    ...(isAdmin
      ? ([
          {
            to: "/admin/badges",
            label: "Admin",
            active: location.pathname.startsWith("/admin"),
          },
        ] as const)
      : []),
  ];

  const headerUser: HeaderUserVM | null =
    status === "authenticated" && user
      ? { displayName: user.displayName, iconUrl: user.iconUrl }
      : null;

  return (
    <RootLayout
      navLinks={navLinks}
      user={headerUser}
      onLoginClick={() => navigate("/login")}
      onLogout={() => {
        void logout();
        navigate("/");
      }}
      onNavigate={(to) => navigate(to)}
    >
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
    </RootLayout>
  );
}
