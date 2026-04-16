/**
 * usePost Hook
 * 投稿詳細取得
 */

import { useState, useCallback } from 'react';
import { apiClient } from '../utils/apiClient';
import { ErrorHandler } from '../utils/errorHandler';
import type { Post } from '../types';

export interface UsePostReturn {
  post: Post | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  deletePost: () => Promise<void>;
}

export const usePost = (postId: number): UsePostReturn => {
  const [post, setPost] = useState<Post | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<{ data: Post }>(`/posts/${postId}`);
      setPost(response.data);
    } catch (err) {
      const { message } = ErrorHandler.handle(err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  // マウント時にデータ取得
  const [initialized, setInitialized] = useState(false);
  if (!initialized) {
    setInitialized(true);
    refetch();
  }

  const deletePost = useCallback(async () => {
    try {
      await apiClient.delete(`/posts/${postId}`);
      setPost(null);
    } catch (err) {
      const { message } = ErrorHandler.handle(err);
      setError(message);
      throw err;
    }
  }, [postId]);

  return { post, isLoading, error, refetch, deletePost };
};
