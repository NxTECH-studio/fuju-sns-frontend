import type { FC } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/Common/ErrorBoundary';
import { AuthGuard } from './components/Auth/AuthGuard';
import { AuthCallbackHandler } from './components/Auth/AuthCallbackHandler';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import './App.css';

/**
 * 404 ページ
 */
const NotFoundPage: FC = () => {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>404 - ページが見つかりません</h1>
      <a href="/login">ログイン画面に戻る</a>
    </div>
  );
};

/**
 * アプリケーションルート
 */
const App: FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* 認証前のページ */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/callback" element={<AuthCallbackHandler />} />

            {/* 認証後のページ */}
            <Route
              path="/dashboard"
              element={
                <AuthGuard>
                  <DashboardPage />
                </AuthGuard>
              }
            />

            {/* デフォルトルート */}
            <Route path="/" element={<Navigate to="/dashboard" />} />

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
