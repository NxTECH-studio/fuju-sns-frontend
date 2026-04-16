/**
 * ログインページコンポーネント
 */

import React, { type FC } from 'react';
import { useAuth } from '../hooks/useAuth';
import { OAUTH_PROVIDERS } from '../utils/constants';
import styles from './LoginPage.module.css';

export const LoginPage: FC = () => {
  const { login, isLoading } = useAuth();
  const [error, setError] = React.useState<string | null>(null);

  const handleLogin = async (provider: 'google' | 'github') => {
    try {
      setError(null);
      await login(provider);
    } catch (err) {
      setError('ログインに失敗しました。もう一度お試しください。');
      console.error('Login error:', err);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>FUJU</h1>
        <p className={styles.subtitle}>みんなでつながるSNS</p>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.buttons}>
          <button
            onClick={() => handleLogin(OAUTH_PROVIDERS.GOOGLE)}
            disabled={isLoading}
            className={styles.button}
          >
            {isLoading ? 'ログイン中...' : 'Google でサインイン'}
          </button>

          <button
            onClick={() => handleLogin(OAUTH_PROVIDERS.GITHUB)}
            disabled={isLoading}
            className={styles.button}
          >
            {isLoading ? 'ログイン中...' : 'GitHub でサインイン'}
          </button>
        </div>

        <p className={styles.notice}>
          ログインすることで、利用規約とプライバシーポリシーに同意します
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
