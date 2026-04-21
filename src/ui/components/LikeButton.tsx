import styles from "./LikeButton.module.css";

interface LikeButtonProps {
  liked: boolean;
  count: number;
  disabled?: boolean;
  onToggle: () => void;
}

export function LikeButton({
  liked,
  count,
  disabled,
  onToggle,
}: LikeButtonProps) {
  return (
    <button
      type="button"
      className={[styles.btn, liked ? styles.liked : ""]
        .filter(Boolean)
        .join(" ")}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-pressed={liked}
    >
      <span aria-hidden>{liked ? "♥" : "♡"}</span>
      <span>{count}</span>
    </button>
  );
}
