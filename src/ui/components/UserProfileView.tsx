import type { ReactNode } from "react";
import type { UserVM } from "../../types/vm";
import { safeCssUrl } from "../../utils/url";
import { Avatar } from "../primitives/Avatar";
import { BadgeChip } from "./BadgeChip";
import styles from "./UserProfileView.module.css";

interface UserProfileViewProps {
  user: UserVM;
  followersCount?: number | null;
  actions?: ReactNode;
  onOpenFollowers?: () => void;
  onOpenFollowing?: () => void;
}

export function UserProfileView({
  user,
  followersCount,
  actions,
  onOpenFollowers,
  onOpenFollowing,
}: UserProfileViewProps) {
  const bannerBg = safeCssUrl(user.bannerUrl);
  return (
    <section className={styles.profile}>
      {bannerBg ? (
        <div
          className={styles.banner}
          style={{ backgroundImage: bannerBg }}
          aria-hidden
        />
      ) : (
        <div className={styles.bannerFallback} aria-hidden />
      )}
      <div className={styles.head}>
        <Avatar src={user.iconUrl} alt={user.displayName} size={72} />
        <div className={styles.meta}>
          <h1 className={styles.name}>{user.displayName}</h1>
          <p className={styles.id}>@{user.displayId}</p>
        </div>
        {actions ? <div className={styles.actions}>{actions}</div> : null}
      </div>
      {user.bio ? <p className={styles.bio}>{user.bio}</p> : null}
      {user.badges.length > 0 ? (
        <ul className={styles.badges}>
          {user.badges.map((b) => (
            <li key={b.id}>
              <BadgeChip badge={b} />
            </li>
          ))}
        </ul>
      ) : null}
      <div className={styles.counts}>
        <button
          type="button"
          className={styles.countBtn}
          onClick={onOpenFollowers}
          disabled={!onOpenFollowers}
        >
          <span className={styles.countNum}>{followersCount ?? "-"}</span>
          <span className={styles.countLabel}>フォロワー</span>
        </button>
        <button
          type="button"
          className={styles.countBtn}
          onClick={onOpenFollowing}
          disabled={!onOpenFollowing}
        >
          <span className={styles.countNum}>→</span>
          <span className={styles.countLabel}>フォロー中</span>
        </button>
      </div>
    </section>
  );
}
