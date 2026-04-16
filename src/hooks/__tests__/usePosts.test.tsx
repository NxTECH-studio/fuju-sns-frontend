/**
 * usePosts Hook Tests
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePosts } from '../usePosts';
import * as apiClient from '../../utils/apiClient';

// Mock API client
vi.mock('../../utils/apiClient');

describe('usePosts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return initial state', () => {
    vi.spyOn(apiClient, 'apiClient', 'get').mockResolvedValue({
      data: [],
      pagination: { offset: 0, limit: 10, total: 0 },
    });

    const { result } = renderHook(() => usePosts());

    expect(result.current).toHaveProperty('posts');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('hasMore');
    expect(result.current).toHaveProperty('loadMore');
    expect(result.current).toHaveProperty('refetch');
    expect(Array.isArray(result.current.posts)).toBe(true);
  });

  it('should have loadMore and refetch functions', () => {
    const { result } = renderHook(() => usePosts());

    expect(typeof result.current.loadMore).toBe('function');
    expect(typeof result.current.refetch).toBe('function');
  });

  it('should handle loading state', () => {
    vi.spyOn(apiClient, 'apiClient', 'get').mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 100))
    );

    const { result } = renderHook(() => usePosts());

    expect(result.current.isLoading).toBe(true);
  });

  it('should have hasMore flag', () => {
    const { result } = renderHook(() => usePosts());

    expect(typeof result.current.hasMore).toBe('boolean');
  });
});
