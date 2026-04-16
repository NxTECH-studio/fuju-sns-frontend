/**
 * CommentForm コンポーネント
 * コメント作成フォーム
 */

import type { FC } from 'react';
import { useState } from 'react';
import { Validators } from '../../utils/validators';
import styles from './CommentForm.module.css';

interface CommentFormProps {
  onSubmit: (content: string) => Promise<void>;
  isLoading?: boolean;
}

export const CommentForm: FC<CommentFormProps> = ({ onSubmit, isLoading = false }) => {
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const contentError = Validators.validateCommentContent(content);
      if (contentError) {
        setError(contentError.message);
        return;
      }

      await onSubmit(content);
      setContent('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'コメント投稿に失敗しました';
      setError(message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.inputGroup}>
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="コメントを入力..."
          className={styles.input}
          maxLength={1000}
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !content.trim()} className={styles.submitBtn}>
          {isLoading ? '投稿中...' : '投稿'}
        </button>
      </div>

      <div className={styles.charCount}>{content.length} / 1000</div>
    </form>
  );
};

export default CommentForm;
