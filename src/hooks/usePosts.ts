/**
 * usePosts Hook
 * 投稿リスト取得（ページネーション、無限スクロール対応）
 */

import { useState, useCallback, useRef } from 'react';
import { apiClient } from '../utils/apiClient';
import { ErrorHandler } from '../utils/errorHandler';
import { DEFAULT_PAGE_SIZE } from '../utils/constants';
import type { Post, PaginatedResponse } from '../types';

export interface UsePostsReturn {
  posts: Post[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
}

export const usePosts = (limit: number = DEFAULT_PAGE_SIZE): UsePostsReturn => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);

  const fetchPosts = useCallback(
    async (offset: number, isInitial = false) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.get<PaginatedResponse<Post>>(
          `/posts?limit=${limit}&offset=${offset}`,
        );

        if (isInitial) {
          setPosts(response.data);
        } else {
          setPosts((prev) => [...prev, ...response.data]);
        }

        // 次のページがあるか判定
        const totalLoaded = (isInitial ? 0 : posts.length) + response.data.length;
        setHasMore(totalLoaded < response.total);

        return response;
      } catch (err) {
        const { message } = ErrorHandler.handle(err);
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [limit, posts.length],
  );

  const refetch = useCallback(async () => {
    offsetRef.current = 0;
    await fetchPosts(0, true);
  }, [fetchPosts]);

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return;
    offsetRef.current += limit;
    await fetchPosts(offsetRef.current, false);
  }, [fetchPosts, hasMore, isLoading, limit]);

  // マウント時にデータ取得
  const [initialized, setInitialized] = useState(false);
  if (!initialized) {
    setInitialized(true);
    refetch();
  }

  return { posts, isLoading, error, hasMore, loadMore, refetch };
};
