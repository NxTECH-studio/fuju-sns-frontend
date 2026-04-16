/**
 * 認証保護コンポーネント
 * 未認証ユーザーをログインページへリダイレクト
 */

import { useEffect, type FC, type ReactNode } from 'react';
import { useAuth } from '../../hooks/useAuth';
import Loading from '../Common/Loading';

interface AuthGuardProps {
  children: ReactNode;
}

export const AuthGuard: FC<AuthGuardProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // 未認証の場合はログイン画面へリダイレクト
      window.location.href = '/login';
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return <Loading />;
  }

  if (!isAuthenticated) {
    return <Loading />;
  }

  return <>{children}</>;
};

export default AuthGuard;
