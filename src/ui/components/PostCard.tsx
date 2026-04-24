import type { ReactNode } from "react";
import type { PostVM } from "../../types/vm";
import { Avatar } from "../primitives/Avatar";
import { OGPPreview } from "./OGPPreview";
import { SafeImage } from "./SafeImage";
import styles from "./PostCard.module.css";

interface PostCardProps {
  post: PostVM;
  onOpen?: () => void;
  onOpenAuthor?: () => void;
  onDelete?: () => void;
  canDelete?: boolean;
  likeSlot?: ReactNode;
  followSlot?: ReactNode;
  showReplyMeta?: boolean;
}

export function PostCard({
  post,
  onOpen,
  onOpenAuthor,
  onDelete,
  canDelete,
  likeSlot,
  followSlot,
  showReplyMeta,
}: PostCardProps) {
  const author = post.author;
  return (
    <article className={styles.card}>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.authorBtn}
          onClick={(e) => {
            e.stopPropagation();
            onOpenAuthor?.();
          }}
          disabled={!onOpenAuthor || !author}
        >
          <Avatar
            src={author?.iconUrl ?? null}
            alt={author?.displayName ?? "deleted"}
            size={36}
          />
          <span className={styles.authorMeta}>
            <span className={styles.displayName}>
              {author?.displayName ?? "(deleted)"}
            </span>
            <span className={styles.displayId}>
              @{author?.displayId ?? "deleted"}
            </span>
          </span>
        </button>
        <time className={styles.time} dateTime={post.createdAt}>
          {formatDate(post.createdAt)}
        </time>
        {followSlot ? (
          <div className={styles.followSlot}>{followSlot}</div>
        ) : null}
      </header>

      {showReplyMeta && post.parentPostId ? (
        <p className={styles.replyMeta}>↳ 返信</p>
      ) : null}

      <button
        type="button"
        className={styles.body}
        onClick={() => onOpen?.()}
        disabled={!onOpen}
      >
        <p className={styles.content}>{post.content}</p>
      </button>

      {post.images.length > 0 ? (
        <ul className={styles.images}>
          {post.images.map((img) => (
            <li key={img.id}>
              <SafeImage
                src={img.publicUrl}
                alt=""
                loading="lazy"
                fallback={
                  <span className={styles.imageFallback}>
                    画像を読み込めません
                  </span>
                }
              />
            </li>
          ))}
        </ul>
      ) : null}

      {post.tags.length > 0 ? (
        <p className={styles.tags}>
          {post.tags.map((t) => (
            <span key={t.id} className={styles.tag}>
              #{t.name}
            </span>
          ))}
        </p>
      ) : null}

      {post.ogpPreviews.length > 0 ? (
        <ul className={styles.ogpList}>
          {post.ogpPreviews.map((o) => (
            <li key={o.url}>
              <OGPPreview preview={o} />
            </li>
          ))}
        </ul>
      ) : null}

      <footer className={styles.footer}>
        <div className={styles.metrics}>
          {likeSlot ?? (
            <span className={styles.metric}>♥ {post.likesCount}</span>
          )}
          <span className={styles.metric}>💬 {post.repliesCount}</span>
        </div>
        {canDelete && onDelete ? (
          <button
            type="button"
            className={styles.deleteBtn}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            削除
          </button>
        ) : null}
      </footer>
    </article>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}
