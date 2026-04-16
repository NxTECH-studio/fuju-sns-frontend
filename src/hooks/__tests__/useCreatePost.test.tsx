/**
 * useCreatePost Hook Tests
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useCreatePost } from '../useCreatePost';
import * as apiClient from '../../utils/apiClient';

// Mock API client
vi.mock('../../utils/apiClient');

describe('useCreatePost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return initial state', () => {
    const { result } = renderHook(() => useCreatePost());

    expect(result.current).toHaveProperty('createPost');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('error');
  });

  it('should have createPost function', () => {
    const { result } = renderHook(() => useCreatePost());

    expect(typeof result.current.createPost).toBe('function');
  });

  it('should start with isLoading as false', () => {
    const { result } = renderHook(() => useCreatePost());

    expect(result.current.isLoading).toBe(false);
  });

  it('should start with error as null', () => {
    const { result } = renderHook(() => useCreatePost());

    expect(result.current.error).toBeNull();
  });

  it('should accept content and imageUrls parameters', async () => {
    vi.spyOn(apiClient, 'apiClient', 'post').mockResolvedValue({
      data: {
        id: 1,
        userId: 1,
        content: 'Test post',
        imageUrls: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    const { result } = renderHook(() => useCreatePost());

    const content = 'Test post content';
    const imageUrls = ['https://example.com/image.jpg'];

    await act(async () => {
      await result.current.createPost(content, imageUrls);
    });

    expect(result.current.isLoading).toBe(false);
  });
});
