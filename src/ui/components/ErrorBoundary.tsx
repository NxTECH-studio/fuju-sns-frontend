import { Component, type ReactNode } from 'react';
import { Button } from '../primitives/Button';

interface Props {
  children: ReactNode;
  fallback?: (err: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error): void {
    console.error('[ErrorBoundary]', error);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    if (this.props.fallback) return this.props.fallback(error, this.reset);
    return (
      <div role="alert" style={{ padding: '24px', textAlign: 'center' }}>
        <p>一時的なエラーが発生しました。</p>
        <p style={{ fontSize: 12, color: 'var(--text)' }}>{error.message}</p>
        <Button variant="primary" onClick={this.reset}>
          再試行
        </Button>
      </div>
    );
  }
}
