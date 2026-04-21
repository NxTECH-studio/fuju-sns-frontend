import styles from './Toast.module.css';

export interface ToastItem {
  id: string;
  kind: 'info' | 'success' | 'error';
  message: string;
}

interface ToastStackProps {
  items: ToastItem[];
  onDismiss: (id: string) => void;
}

export function ToastStack({ items, onDismiss }: ToastStackProps) {
  if (items.length === 0) return null;
  return (
    <div className={styles.stack} role="status" aria-live="polite">
      {items.map((t) => (
        <button
          key={t.id}
          type="button"
          className={[styles.item, styles[t.kind]].join(' ')}
          onClick={() => onDismiss(t.id)}
        >
          {t.message}
        </button>
      ))}
    </div>
  );
}
