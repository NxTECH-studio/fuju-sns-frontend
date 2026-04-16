/**
 * useCreatePost Hook
 * 投稿作成
 */

import { useState, useCallback } from 'react';
import { apiClient } from '../utils/apiClient';
import { ErrorHandler } from '../utils/errorHandler';
import { Validators } from '../utils/validators';
import type { Post, CreatePostRequest } from '../types';

export interface UseCreatePostReturn {
  isLoading: boolean;
  error: string | null;
  createPost: (content: string, imageUrls?: string[]) => Promise<Post>;
}

export const useCreatePost = (): UseCreatePostReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPost = useCallback(async (content: string, imageUrls?: string[]): Promise<Post> => {
    setIsLoading(true);
    setError(null);

    try {
      // バリデーション
      const contentError = Validators.validatePostContent(content);
      if (contentError) {
        throw new Error(contentError.message);
      }

      if (imageUrls && imageUrls.length > 0) {
        const imagesError = Validators.validatePostImages(imageUrls);
        if (imagesError) {
          throw new Error(imagesError.message);
        }
      }

      // API リクエスト
      const request: CreatePostRequest = {
        content,
        image_urls: imageUrls,
      };

      const response = await apiClient.post<{ data: Post }>('/posts', request);
      return response.data;
    } catch (err) {
      const { message } = ErrorHandler.handle(err);
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { isLoading, error, createPost };
};
