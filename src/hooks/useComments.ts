/**
 * useComments Hook
 * コメント取得・作成・削除
 */

import { useState, useCallback } from 'react';
import { apiClient } from '../utils/apiClient';
import { ErrorHandler } from '../utils/errorHandler';
import type { Comment } from '../types';

export interface UseCommentsReturn {
  comments: Comment[];
  isLoading: boolean;
  error: string | null;
  createComment: (content: string) => Promise<Comment>;
  deleteComment: (commentId: number) => Promise<void>;
  refetch: () => Promise<void>;
}

export const useComments = (postId: number): UseCommentsReturn => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Note: バックエンドが GET /posts/{id}/comments を提供している場合
      // const response = await apiClient.get<PaginatedResponse<Comment>>(`/posts/${postId}/comments`);
      // setComments(response.data);
      // 仮実装
      setComments([]);
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

  const createComment = useCallback(
    async (content: string): Promise<Comment> => {
      try {
        const response = await apiClient.post<{ data: Comment }>(
          `/posts/${postId}/comments`,
          { content }
        );
        setComments((prev) => [response.data, ...prev]);
        return response.data;
      } catch (err) {
        const { message } = ErrorHandler.handle(err);
        setError(message);
        throw err;
      }
    },
    // eslint-disable react-hooks/exhaustive-deps
    [postId]
  );

  const deleteComment = useCallback(
    async (commentId: number) => {
      try {
        await apiClient.delete(`/posts/${postId}/comments/${commentId}`);
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      } catch (err) {
        const { message } = ErrorHandler.handle(err);
        setError(message);
        throw err;
      }
    },
    [postId]
  );

  return { comments, isLoading, error, createComment, deleteComment, refetch };
};
