import styles from "./SettingsNav.module.css";

export interface SettingsNavItem {
  to: string;
  label: string;
  active?: boolean;
}

interface SettingsNavProps {
  items: SettingsNavItem[];
  onNavigate: (to: string) => void;
}

export function SettingsNav({ items, onNavigate }: SettingsNavProps) {
  return (
    <nav className={styles.nav} aria-label="settings">
      <ul>
        {items.map((item) => (
          <li key={item.to}>
            <button
              type="button"
              className={[styles.link, item.active ? styles.linkActive : ""]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onNavigate(item.to)}
            >
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
