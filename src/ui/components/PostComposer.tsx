import { useState, type FormEvent } from "react";
import { TextArea } from "../primitives/TextArea";
import { Button } from "../primitives/Button";
import styles from "./PostComposer.module.css";

const MAX_LEN = 120;
// Leave a small over-fill allowance so the counter can go negative and
// signal the user they must trim before the submit re-enables.
const INPUT_OVERFLOW_BUFFER = 50;

interface PostComposerProps {
  placeholder?: string;
  parentPostId?: string | null;
  onSubmit: (input: {
    content: string;
    parentPostId?: string | null;
  }) => Promise<void>;
}

export function PostComposer({
  placeholder,
  parentPostId,
  onSubmit,
}: PostComposerProps) {
  const [content, setContent] = useState("");
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
        parentPostId: parentPostId ?? undefined,
      });
      setContent("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "unknown error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className={styles.wrap} onSubmit={handle}>
      <TextArea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder ?? "いま何してる？"}
        maxLength={MAX_LEN + INPUT_OVERFLOW_BUFFER}
        rows={3}
      />
      <div className={styles.footer}>
        <span
          className={styles.counter}
          style={{ color: remaining < 0 ? "var(--danger)" : "var(--text)" }}
        >
          {remaining}
        </span>
        <Button type="submit" variant="primary" disabled={disabled}>
          {busy ? "送信中..." : "投稿"}
        </Button>
      </div>
      {error ? <p className={styles.error}>{error}</p> : null}
    </form>
  );
}
