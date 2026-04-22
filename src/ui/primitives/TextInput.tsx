import type { InputHTMLAttributes } from "react";
import styles from "./TextInput.module.css";

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function TextInput({
  label,
  error,
  className,
  id,
  ...rest
}: TextInputProps) {
  const inputId = id ?? rest.name;
  return (
    <label className={styles.wrap}>
      {label ? <span className={styles.label}>{label}</span> : null}
      <input
        id={inputId}
        className={[styles.input, className].filter(Boolean).join(" ")}
        {...rest}
      />
      {error ? <span className={styles.error}>{error}</span> : null}
    </label>
  );
}
