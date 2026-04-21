import styles from "./Avatar.module.css";

interface AvatarProps {
  src: string | null | undefined;
  alt: string;
  size?: number;
}

export function Avatar({ src, alt, size = 40 }: AvatarProps) {
  const dim = `${size}px`;
  if (!src) {
    return (
      <span
        className={styles.fallback}
        style={{ width: dim, height: dim, fontSize: Math.floor(size / 2) }}
        aria-label={alt}
      >
        {alt.slice(0, 1).toUpperCase() || "?"}
      </span>
    );
  }
  return (
    <img
      className={styles.img}
      src={src}
      alt={alt}
      width={size}
      height={size}
      style={{ width: dim, height: dim }}
      loading="lazy"
    />
  );
}
