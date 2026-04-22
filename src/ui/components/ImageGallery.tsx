import type { ImageVM } from "../../types/vm";
import { Button } from "../primitives/Button";
import styles from "./ImageGallery.module.css";

interface ImageGalleryProps {
  images: ImageVM[];
  onDelete?: (id: string) => void;
  onAttach?: (image: ImageVM) => void;
  selectedIds?: readonly string[];
}

export function ImageGallery({
  images,
  onDelete,
  onAttach,
  selectedIds,
}: ImageGalleryProps) {
  if (images.length === 0) {
    return <p style={{ color: "var(--text)" }}>画像はありません</p>;
  }
  return (
    <ul className={styles.grid}>
      {images.map((img) => {
        const selected = selectedIds?.includes(img.id) ?? false;
        return (
          <li key={img.id} className={styles.card}>
            <img
              className={styles.img}
              src={img.publicUrl}
              alt={img.fileName}
              loading="lazy"
            />
            <div className={styles.meta}>
              <p className={styles.name}>{img.fileName}</p>
              <p className={styles.size}>{formatBytes(img.fileSize)}</p>
            </div>
            <div className={styles.actions}>
              {onAttach ? (
                <Button
                  variant={selected ? "secondary" : "primary"}
                  disabled={selected}
                  onClick={() => onAttach(img)}
                >
                  {selected ? "添付済み" : "投稿に添付"}
                </Button>
              ) : null}
              {onDelete ? (
                <Button variant="danger" onClick={() => onDelete(img.id)}>
                  削除
                </Button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
