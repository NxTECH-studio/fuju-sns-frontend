/**
 * useUser Hook
 * ユーザー情報取得・更新
 */

import { useState, useCallback } from 'react';
import { apiClient } from '../utils/apiClient';
import { ErrorHandler } from '../utils/errorHandler';
import type { User } from '../types';

export interface UseUserReturn {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<User>;
}

export const useUser = (userId: number): UseUserReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<{ data: User }>(`/users/${userId}`);
      setUser(response.data);
    } catch (err) {
      const { message } = ErrorHandler.handle(err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // マウント時にデータ取得
  const [initialized, setInitialized] = useState(false);
  if (!initialized) {
    setInitialized(true);
    refetch();
  }

  const updateUser = useCallback(
    async (updates: Partial<User>): Promise<User> => {
      try {
        const response = await apiClient.put<{ data: User }>(
          `/users/${userId}`,
          updates
        );
        setUser(response.data);
        return response.data;
      } catch (err) {
        const { message } = ErrorHandler.handle(err);
        setError(message);
        throw err;
      }
    },
    [userId]
  );

  return { user, isLoading, error, refetch, updateUser };
};
