import { useState, type FormEvent } from 'react';
import { TextArea } from '../primitives/TextArea';
import { Button } from '../primitives/Button';
import styles from './PostComposer.module.css';

const MAX_LEN = 120;

interface PostComposerProps {
  placeholder?: string;
  parentPostId?: string | null;
  attachedImageIds?: string[];
  onAttachImage?: () => void;
  onDetachImage?: (imageId: string) => void;
  onSubmit: (input: {
    content: string;
    imageIds?: string[];
    parentPostId?: string | null;
  }) => Promise<void>;
}

export function PostComposer({
  placeholder,
  parentPostId,
  attachedImageIds = [],
  onAttachImage,
  onDetachImage,
  onSubmit,
}: PostComposerProps) {
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = MAX_LEN - content.length;
  const disabled = busy || content.trim().length === 0 || remaining < 0;

  const handle = async (e: FormEvent) => {
    e.preventDefault();
    if (disabled) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        content,
        imageIds: attachedImageIds.length > 0 ? attachedImageIds : undefined,
        parentPostId: parentPostId ?? undefined,
      });
      setContent('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'unknown error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className={styles.wrap} onSubmit={handle}>
      <TextArea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder ?? 'いま何してる？'}
        maxLength={MAX_LEN + 50}
        rows={3}
      />
      {attachedImageIds.length > 0 ? (
        <ul className={styles.imageList}>
          {attachedImageIds.map((id) => (
            <li key={id} className={styles.imageItem}>
              <code>{id.slice(0, 8)}...</code>
              {onDetachImage ? (
                <button
                  type="button"
                  className={styles.detach}
                  onClick={() => onDetachImage(id)}
                >
                  ×
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      <div className={styles.footer}>
        {onAttachImage ? (
          <Button type="button" onClick={onAttachImage}>
            画像を添付
          </Button>
        ) : null}
        <span
          className={styles.counter}
          style={{ color: remaining < 0 ? '#d33' : 'var(--text)' }}
        >
          {remaining}
        </span>
        <Button type="submit" variant="primary" disabled={disabled}>
          {busy ? '送信中...' : '投稿'}
        </Button>
      </div>
      {error ? <p className={styles.error}>{error}</p> : null}
    </form>
  );
}
