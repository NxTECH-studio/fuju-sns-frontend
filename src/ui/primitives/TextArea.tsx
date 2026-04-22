import type { TextareaHTMLAttributes } from "react";
import styles from "./TextArea.module.css";

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function TextArea({ label, error, className, ...rest }: TextAreaProps) {
  return (
    <label className={styles.wrap}>
      {label ? <span className={styles.label}>{label}</span> : null}
      <textarea
        className={[styles.textarea, className].filter(Boolean).join(" ")}
        {...rest}
      />
      {error ? <span className={styles.error}>{error}</span> : null}
    </label>
  );
}
