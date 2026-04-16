/**
 * PostList コンポーネント
 * 投稿リスト表示（無限スクロール対応）
 */

import type { FC } from 'react';
import { useEffect, useRef } from 'react';
import PostCard from './PostCard';
import Loading from '../Common/Loading';
import type { Post } from '../../types';

interface PostListProps {
  posts: Post[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => Promise<void>;
  onDelete?: (postId: number) => void;
}

export const PostList: FC<PostListProps> = ({
  posts,
  isLoading,
  hasMore,
  onLoadMore,
  onDelete,
}) => {
  const observerTarget = useRef<HTMLDivElement>(null);

  // 無限スクロール実装
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          onLoadMore();
        }
      },
      { threshold: 0.1 },
    );

    const target = observerTarget.current;
    if (target) {
      observer.observe(target);
    }

    return () => {
      if (target) {
        observer.unobserve(target);
      }
    };
  }, [hasMore, isLoading, onLoadMore]);

  if (posts.length === 0 && !isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
        投稿がまだありません
      </div>
    );
  }

  return (
    <div>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} onDelete={onDelete} />
      ))}

      {/* 無限スクロール トリガー */}
      {hasMore && <div ref={observerTarget} style={{ height: 100 }} />}

      {isLoading && <Loading />}
    </div>
  );
};

export default PostList;
