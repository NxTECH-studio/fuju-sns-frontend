import type { BadgeVM } from "../../types/vm";
import styles from "./BadgeChip.module.css";

interface BadgeChipProps {
  badge: BadgeVM;
}

export function BadgeChip({ badge }: BadgeChipProps) {
  return (
    <span className={styles.chip} title={badge.description || badge.label}>
      {badge.iconUrl ? (
        <img className={styles.icon} src={badge.iconUrl} alt="" />
      ) : (
        <span
          className={styles.dot}
          style={{ background: badge.color }}
          aria-hidden
        />
      )}
      <span>{badge.label}</span>
    </span>
  );
}
