/**
 * CreatePostForm コンポーネント
 * 投稿作成フォーム
 */

import type { FC } from 'react';
import { useState, useCallback } from 'react';
import { Validators } from '../../utils/validators';
import styles from './CreatePostForm.module.css';

interface CreatePostFormProps {
  onSubmit: (content: string, imageUrls?: string[]) => Promise<void>;
  isLoading?: boolean;
}

export const CreatePostForm: FC<CreatePostFormProps> = ({ onSubmit, isLoading = false }) => {
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleAddImage = useCallback(() => {
    if (!imageUrl.trim()) {
      setError('URL を入力してください');
      return;
    }

    if (imageUrl && !imageUrl.startsWith('http')) {
      setError('有効な URL を入力してください');
      return;
    }

    setImages((prev) => [...prev, imageUrl]);
    setImageUrl('');
    setError(null);
  }, [imageUrl]);

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const contentError = Validators.validatePostContent(content);
      if (contentError) {
        setError(contentError.message);
        return;
      }

      await onSubmit(content, images);
      setContent('');
      setImages([]);
    } catch (err) {
      const message = err instanceof Error ? err.message : '投稿に失敗しました';
      setError(message);
    }
  };

  const charCount = content.length;
  const maxChars = 5000;

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.container}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="何を考えていますか？"
          className={styles.textarea}
          maxLength={maxChars}
          disabled={isLoading}
        />

        <div className={styles.footer}>
          <div className={styles.charCount}>
            {charCount} / {maxChars}
          </div>

          <button
            type="submit"
            disabled={isLoading || !content.trim()}
            className={styles.submitBtn}
          >
            {isLoading ? '投稿中...' : '投稿'}
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {/* 画像 URL 追加 */}
        <div className={styles.imageSection}>
          <div className={styles.imageInput}>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="画像 URL を入力"
              className={styles.input}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={handleAddImage}
              disabled={isLoading}
              className={styles.addImageBtn}
            >
              追加 ({images.length}/10)
            </button>
          </div>

          {images.length > 0 && (
            <div className={styles.imagePreview}>
              {images.map((url, idx) => (
                <div key={idx} className={styles.previewItem}>
                  <img src={url} alt={`プレビュー ${idx + 1}`} />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className={styles.removeBtn}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </form>
  );
};

export default CreatePostForm;
