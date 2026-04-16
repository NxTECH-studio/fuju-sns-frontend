/**
 * Error Boundary コンポーネント
 * React コンポーネントのエラーをキャッチして表示
 */

import React, { type FC, type ReactNode } from 'react';
import { IS_DEVELOPMENT } from '../../utils/constants';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // ログの出力
    if (IS_DEVELOPMENT) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Note: エラーログサービスへの送信はここで実装
    //例: Sentry, LogRocket など
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return this.props.fallback?.(this.state.error) || <ErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}

/**
 * デフォルトフォールバック UI
 */
const ErrorFallback: FC<{ error: Error }> = ({ error }) => {
  const isDev = IS_DEVELOPMENT;

  return (
    <div
      style={{
        padding: '2rem',
        textAlign: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          backgroundColor: '#fee',
          color: '#c00',
          padding: '1rem',
          borderRadius: '0.5rem',
          marginBottom: '1rem',
          border: '1px solid #fcc',
        }}
      >
        <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>
          予期しないエラーが発生しました
        </h1>

        {isDev && (
          <div
            style={{
              textAlign: 'left',
              backgroundColor: 'white',
              color: '#333',
              padding: '1rem',
              borderRadius: '0.5rem',
              marginTop: '1rem',
              overflow: 'auto',
              fontSize: '0.875rem',
              fontFamily: 'monospace',
            }}
          >
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {error.toString()}
              {'\n\n'}
              {error.stack}
            </pre>
          </div>
        )}

        <p style={{ margin: '1rem 0 0 0', fontSize: '0.875rem', color: '#666' }}>
          ページを再読み込みしてください。問題が解決しない場合はお問い合わせください。
        </p>
      </div>

      <button
        onClick={() => window.location.reload()}
        style={{
          padding: '0.5rem 1.5rem',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '0.25rem',
          cursor: 'pointer',
          fontSize: '1rem',
        }}
      >
        ページを再読み込み
      </button>
    </div>
  );
};

export default ErrorBoundary;
