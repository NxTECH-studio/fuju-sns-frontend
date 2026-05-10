import { type CSSProperties, type ReactElement } from 'react';

import type { AuthError } from '../types';

export interface AuthErrorFallbackProps {
  error: AuthError | null;
  onRetry?: () => void;
  className?: string;
  style?: CSSProperties;
}

export function AuthErrorFallback(props: Readonly<AuthErrorFallbackProps>): ReactElement {
  const { error, onRetry, className, style } = props;
  return (
    <div role="alert" data-fuju-auth-form="error" className={className} style={style}>
      <p>認証サーバーに接続できませんでした。</p>
      {error ? (
        <p>
          <code>{error.code}</code>: {error.message}
        </p>
      ) : null}
      {onRetry ? (
        <button type="button" onClick={onRetry}>
          再試行
        </button>
      ) : null}
    </div>
  );
}
