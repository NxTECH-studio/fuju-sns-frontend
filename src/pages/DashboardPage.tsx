/**
 * ダッシュボード (Phase 2 実装版)
 * タイムラインフィード
 */

import type { FC } from 'react';
import { useState, useCallback } from 'react';
import { usePosts } from '../hooks/usePosts';
import { useCreatePost } from '../hooks/useCreatePost';
import { useAuth } from '../hooks/useAuth';
import { PostList } from '../components/Posts/PostList';
import { CreatePostForm } from '../components/Posts/CreatePostForm';
import Loading from '../components/Common/Loading';
import styles from './DashboardPage.module.css';

export const DashboardPage: FC = () => {
  const { user, logout } = useAuth();
  const { posts, isLoading, hasMore, loadMore, refetch } = usePosts();
  const { createPost, isLoading: isCreating } = useCreatePost();
  const [error, setError] = useState<string | null>(null);

  const handleCreatePost = useCallback(
    async (content: string, imageUrls?: string[]) => {
      try {
        setError(null);
        await createPost(content, imageUrls);
        await refetch();
      } catch (err) {
        const message = err instanceof Error ? err.message : '投稿作成に失敗しました';
        setError(message);
      }
    },
    [createPost, refetch],
  );

  const handleDelete = async (postId: number) => {
    try {
      setError(null);
      // Note: API が /posts/{id} DELETE をサポートしたら実装
      console.log('Delete post:', postId);
      await refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : '削除に失敗しました';
      setError(message);
    }
  };

  return (
    <div className={styles.container}>
      {/* ヘッダー */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>FUJU タイムライン</h1>
          <div className={styles.userSection}>
            <span className={styles.userName}>{user?.display_name}</span>
            <button onClick={logout} className={styles.logoutBtn}>
              ログアウト
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className={styles.content}>
        <div className={styles.timeline}>
          {error && (
            <div className={styles.errorBanner}>
              <span>{error}</span>
              <button onClick={() => setError(null)}>✕</button>
            </div>
          )}

          {/* 投稿作成フォーム */}
          <CreatePostForm onSubmit={handleCreatePost} isLoading={isCreating} />

          {/* 投稿リスト */}
          {isLoading && posts.length === 0 ? (
            <Loading />
          ) : (
            <PostList
              posts={posts}
              isLoading={isLoading}
              hasMore={hasMore}
              onLoadMore={loadMore}
              onDelete={handleDelete}
            />
          )}
        </div>

        {/* サイドバー（将来実装） */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarCard}>
            <h3>推奨ユーザー</h3>
            <p style={{ color: '#999', fontSize: '0.85rem' }}>Phase 2で実装予定</p>
          </div>

          <div className={styles.sidebarCard}>
            <h3>トレンド</h3>
            <p style={{ color: '#999', fontSize: '0.85rem' }}>Phase 2で実装予定</p>
          </div>
        </aside>
      </main>
    </div>
  );
};

export default DashboardPage;
