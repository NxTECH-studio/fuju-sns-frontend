/**
 * PostCard コンポーネント
 * 投稿カード表示
 */

import type { FC } from 'react';
import type { Post } from '../../types';
import styles from './PostCard.module.css';

interface PostCardProps {
  post: Post;
  onDelete?: (postId: number) => void;
}

export const PostCard: FC<PostCardProps> = ({ post, onDelete }) => {
  const handleDelete = () => {
    if (onDelete && window.confirm('この投稿を削除しますか？')) {
      onDelete(post.id);
    }
  };

  return (
    <div className={styles.card}>
      {/* ユーザー情報 */}
      <div className={styles.header}>
        <div className={styles.userInfo}>
          <img
            src={post.user?.avatar_url || ''}
            alt={post.user?.display_name}
            className={styles.avatar}
          />
          <div>
            <div className={styles.displayName}>{post.user?.display_name}</div>
            <div className={styles.timestamp}>
              {new Date(post.created_at).toLocaleString('ja-JP')}
            </div>
          </div>
        </div>
        {onDelete && (
          <button onClick={handleDelete} className={styles.deleteBtn}>
            削除
          </button>
        )}
      </div>

      {/* 投稿内容 */}
      <div className={styles.content}>{post.content}</div>

      {/* 画像 */}
      {post.image_urls && post.image_urls.length > 0 && (
        <div className={styles.images}>
          {post.image_urls.slice(0, 4).map((url, idx) => (
            <img key={idx} src={url} alt="投稿画像" className={styles.image} />
          ))}
        </div>
      )}

      {/* メタ情報 */}
      <div className={styles.meta}>
        <span>💬 {post.comments_count || 0}</span>
        <span>❤️ {post.likes_count || 0}</span>
      </div>
    </div>
  );
};

export default PostCard;
