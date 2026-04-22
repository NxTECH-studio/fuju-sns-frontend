import type { OGPPreviewVM } from "../../types/vm";
import { isSafeHttpUrl } from "../../utils/url";
import styles from "./OGPPreview.module.css";

interface OGPPreviewProps {
  preview: OGPPreviewVM;
}

export function OGPPreview({ preview }: OGPPreviewProps) {
  const hrefSafe = isSafeHttpUrl(preview.url);
  const imgSafe = isSafeHttpUrl(preview.imageUrl);
  const body = (
    <>
      {imgSafe ? (
        <img
          className={styles.img}
          src={preview.imageUrl}
          alt=""
          loading="lazy"
        />
      ) : null}
      <div className={styles.body}>
        {preview.siteName ? (
          <p className={styles.site}>{preview.siteName}</p>
        ) : null}
        {preview.title ? <p className={styles.title}>{preview.title}</p> : null}
        {preview.description ? (
          <p className={styles.desc}>{preview.description}</p>
        ) : null}
      </div>
    </>
  );
  if (!hrefSafe) {
    return <div className={styles.card}>{body}</div>;
  }
  return (
    <a
      className={styles.card}
      href={preview.url}
      target="_blank"
      rel="noreferrer noopener"
    >
      {body}
    </a>
  );
}
