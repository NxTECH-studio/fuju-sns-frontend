import type { ReactNode } from "react";
import type { UserVM } from "../../services/vm";
import { Avatar } from "../primitives/Avatar";
import styles from "./UserCard.module.css";

interface UserCardProps {
  user: UserVM;
  onOpen?: () => void;
  action?: ReactNode;
}

export function UserCard({ user, onOpen, action }: UserCardProps) {
  return (
    <article className={styles.card}>
      <button
        type="button"
        className={styles.clickable}
        onClick={onOpen}
        disabled={!onOpen}
      >
        <Avatar src={user.iconUrl} alt={user.displayName} size={40} />
        <div className={styles.meta}>
          <span className={styles.name}>{user.displayName}</span>
          <span className={styles.id}>@{user.displayId}</span>
          {user.bio ? <p className={styles.bio}>{user.bio}</p> : null}
        </div>
      </button>
      {action}
    </article>
  );
}
