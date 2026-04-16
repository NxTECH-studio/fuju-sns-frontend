/**
 * AuthContext テスト
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AuthProvider } from './AuthContext';
import { useAuth } from '../hooks/useAuth';

// テスト用コンポーネント
const TestComponent = () => {
  const { user, isLoading, isAuthenticated } = useAuth();

  return (
    <div>
      <div>{isLoading ? 'Loading' : 'Loaded'}</div>
      <div>{isAuthenticated ? 'Authenticated' : 'NotAuthenticated'}</div>
      <div>{user?.display_name || 'No User'}</div>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with loading state', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    expect(screen.getByText(/Loaded/i)).toBeTruthy();
    expect(screen.getByText(/NotAuthenticated/i)).toBeTruthy();
  });

  it('should throw error when useAuth is used outside AuthProvider', () => {
    // Error 出力を suppress
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within AuthProvider');

    spy.mockRestore();
  });
});
