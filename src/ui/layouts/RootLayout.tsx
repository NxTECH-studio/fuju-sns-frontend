import type { ReactNode } from "react";
import { Avatar } from "../primitives/Avatar";
import { Button } from "../primitives/Button";
import styles from "./RootLayout.module.css";

export interface NavLink {
  to: string;
  label: string;
  active?: boolean;
}

export interface HeaderUserVM {
  displayName: string;
  iconUrl: string | null;
}

interface RootLayoutProps {
  navLinks: NavLink[];
  user: HeaderUserVM | null;
  onLoginClick: () => void;
  onLogout: () => void;
  onNavigate: (to: string) => void;
  children: ReactNode;
}

export function RootLayout({
  navLinks,
  user,
  onLoginClick,
  onLogout,
  onNavigate,
  children,
}: RootLayoutProps) {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.brand}
          onClick={() => onNavigate("/")}
        >
          Fuju
        </button>
        <div className={styles.headerRight}>
          {user ? (
            <div className={styles.userBlock}>
              <Avatar src={user.iconUrl} alt={user.displayName} size={28} />
              <span className={styles.userName}>{user.displayName}</span>
              <Button variant="ghost" onClick={onLogout}>
                ログアウト
              </Button>
            </div>
          ) : (
            <Button variant="primary" onClick={onLoginClick}>
              ログイン
            </Button>
          )}
        </div>
      </header>
      <div className={styles.body}>
        <nav className={styles.nav} aria-label="primary">
          <ul>
            {navLinks.map((l) => (
              <li key={l.to}>
                <button
                  type="button"
                  className={[
                    styles.navLink,
                    l.active ? styles.navLinkActive : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => onNavigate(l.to)}
                >
                  {l.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
