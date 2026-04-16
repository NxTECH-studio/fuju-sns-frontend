/**
 * useAuth Hook
 * 認証状態にアクセスするカスタムフック
 */

import React from 'react';
import type { AuthContextType } from '../context/AuthContext';
import { AuthContext } from '../context/AuthContext';

/**
 * useAuth Hook
 * コンポーネントから認証情報にアクセス
 */
export const useAuth = (): AuthContextType => {
  const context = React.useContext(AuthContext as React.Context<AuthContextType | undefined>);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
};
