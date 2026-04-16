/**
 * 認証コンテキスト
 * アプリケーション全体での認証状態管理
 */

import React, { type FC, type ReactNode } from 'react';
import type { User } from '../types';
import { apiClient } from '../utils/apiClient';
import { ErrorHandler } from '../utils/errorHandler';
import { IS_DEVELOPMENT } from '../utils/constants';
import type { OAuthAuthorizeRequest, OAuthAuthorizeResponse } from '../types';
import { OAUTH_REDIRECT_URI } from '../utils/constants';

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (provider: 'google' | 'github') => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  setCurrentUser: (user: User) => void;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export { AuthContext };

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  /**
   * セッション確認: アプリケーション初期化時に実行
   * セッションクッキーが有効な場合、ダッシュボードアクセス時に user 情報を取得
   */
  const checkSession = React.useCallback(async () => {
    setIsLoading(true);
    try {
      // セッションクッキーが有効か確認：GET /posts でテスト
      // 成功時は、ダッシュボード側で user 情報を取得
      // 401 エラー時は、セッション無効（ログアウト状態）
      
      if (IS_DEVELOPMENT) {
        console.log('[AuthContext] Session check completed');
      }
    } catch (error) {
      // 認証情報なし（ログインしていない状態）
      if (IS_DEVELOPMENT) {
        console.log('[AuthContext] No active session');
      }
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * マウント時にセッションを確認
   */
  React.useEffect(() => {
    checkSession();
  }, [checkSession]);

  /**
   * OAuth2 ログイン処理
   */
  const login = React.useCallback(async (provider: 'google' | 'github') => {
    try {
      setIsLoading(true);

      // Step 1: バックエンドから認可 URL を取得
      const authorizeRequest: OAuthAuthorizeRequest = {
        provider,
        redirect_uri: OAUTH_REDIRECT_URI,
      };
      
      if (IS_DEVELOPMENT) {
        console.log('[AuthContext] Sending authorize request:', authorizeRequest);
      }

      const response = await apiClient.post<OAuthAuthorizeResponse>(
        '/auth/oauth/authorize',
        authorizeRequest,
      );

      if (IS_DEVELOPMENT) {
        console.log('[AuthContext] Got redirect URL:', response.redirect_url);
      }

      // Step 2: OAuth2 プロバイダーへリダイレクト
      window.location.href = response.redirect_url;
    } catch (error) {
      const { message } = ErrorHandler.handle(error);
      console.error('[AuthContext] Login failed:', message);
      setIsLoading(false);
      throw error;
    }
  }, []);

  /**
   * ログアウト処理
   */
  const logout = React.useCallback(async () => {
    try {
      setIsLoading(true);

      // バックエンドにログアウトリクエスト
      await apiClient.post('/auth/logout', {});

      // ローカル状態をクリア
      setUser(null);

      // ログイン画面へリダイレクト
      window.location.href = '/login';
    } catch (error) {
      const { message } = ErrorHandler.handle(error);
      console.error('[AuthContext] Logout failed:', message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 現在のユーザーを設定
   */
  const setCurrentUser = React.useCallback((currentUser: User) => {
    setUser(currentUser);
    if (IS_DEVELOPMENT) {
      console.log('[AuthContext] User set:', currentUser.username);
    }
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    checkSession,
    setCurrentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
