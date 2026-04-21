import styles from "./ErrorMessage.module.css";

interface ErrorMessageProps {
  message: string;
  prefix?: string;
}

export function ErrorMessage({
  message,
  prefix = "エラー",
}: ErrorMessageProps) {
  return (
    <p className={styles.msg} role="alert">
      {prefix}: {message}
    </p>
  );
}
