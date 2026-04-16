/**
 * OAuth2 コールバックハンドラーコンポーネント
 * OAuth プロバイダーからのコールバック処理を行う
 */

import React, { type FC, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { apiClient } from '../../utils/apiClient';
import { ErrorHandler } from '../../utils/errorHandler';
import { IS_DEVELOPMENT } from '../../utils/constants';
import type { OAuthCallbackRequest, OAuthCallbackResponse } from '../../types';

/**
 * 認証コールバックページコンポーネント
 * URL: /auth/callback?code={code}&state={state}
 */
export const AuthCallbackHandler: FC = () => {
  const { checkSession } = useAuth();
  const [error, setError] = React.useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // URL パラメータから code と state を取得
        const params = new URLSearchParams(globalThis.location.search);
        const code = params.get('code');
        const state = params.get('state');

        if (!code || !state) {
          throw new Error('OAuth コードまたはステートが見つかりません');
        }

        if (IS_DEVELOPMENT) {
          console.log('[AuthCallbackHandler] Processing OAuth callback...');
        }

        // バックエンドにコールバック情報を送信
        const callbackRequest: OAuthCallbackRequest = {
          code,
          state,
          device_type: 'web',
        };

        const response = await apiClient.post<OAuthCallbackResponse>(
          '/auth/oauth/callback',
          callbackRequest,
        );

        if (IS_DEVELOPMENT) {
          console.log('[AuthCallbackHandler] Authentication successful:', response.user);
        }

        // セッション情報をリロード
        await checkSession();

        // ダッシュボードへリダイレクト
        globalThis.location.href = '/dashboard';
      } catch (err) {
        const { message } = ErrorHandler.handle(err);
        console.error('[AuthCallbackHandler] Callback failed:', message);
        setError(message);
      }
    };

    handleCallback();
  }, [checkSession]);

  if (error) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          backgroundColor: '#f0f0f0',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div
          style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '0.5rem',
            textAlign: 'center',
            maxWidth: '500px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <h2 style={{ color: '#d32f2f', marginTop: 0 }}>認証に失敗しました</h2>
          <p style={{ color: '#666', marginBottom: '1.5rem' }}>{error}</p>
          <a
            href="/login"
            style={{
              display: 'inline-block',
              padding: '0.5rem 1.5rem',
              backgroundColor: '#007bff',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer',
            }}
          >
            ログイン画面に戻る
          </a>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#f0f0f0',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f0f0f0',
            borderTop: '4px solid #007bff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem',
          }}
        />
        <p style={{ color: '#666', fontSize: '0.875rem' }}>ログイン処理を完了しています...</p>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AuthCallbackHandler;
