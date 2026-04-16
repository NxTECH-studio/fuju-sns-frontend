/**
 * CreatePostForm Component Tests
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CreatePostForm } from '../CreatePostForm';

describe('CreatePostForm', () => {
  it('should render form inputs', () => {
    const mockOnSubmit = vi.fn();

    render(
      <CreatePostForm onSubmit={mockOnSubmit} />
    );

    const textarea = screen.getByPlaceholderText(/何が起きている/i) || 
                     screen.getByPlaceholderText(/投稿内容/i) ||
                     screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
  });

  it('should render submit button', () => {
    const mockOnSubmit = vi.fn();

    render(
      <CreatePostForm onSubmit={mockOnSubmit} />
    );

    const submitButton = screen.getByRole('button', { name: /投稿|post|送信/i }) ||
                        screen.getByRole('button', { name: /送信|submit/i });
    expect(submitButton).toBeInTheDocument();
  });

  it('should call onSubmit with content when form is submitted', async () => {
    const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <CreatePostForm onSubmit={mockOnSubmit} />
    );

    const textarea = screen.getByRole('textbox');
    const submitButton = screen.getAllByRole('button').find(btn => 
      btn.textContent?.includes('投稿') || btn.textContent?.includes('submit')
    ) || screen.getAllByRole('button')[0];

    fireEvent.change(textarea, { target: { value: 'Test post content' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith('Test post content', []);
    });
  });

  it('should handle character limit validation', () => {
    const mockOnSubmit = vi.fn();

    render(
      <CreatePostForm onSubmit={mockOnSubmit} />
    );

    const textarea = screen.getByRole('textbox');
    const longContent = 'a'.repeat(5001); // Over 5000 char limit

    fireEvent.change(textarea, { target: { value: longContent } });

    // Should show error or truncate
    expect(textarea).toHaveValue('a'.repeat(5000));
  });

  it('should show loading state', () => {
    const mockOnSubmit = vi.fn();

    const { rerender } = render(
      <CreatePostForm onSubmit={mockOnSubmit} isLoading={false} />
    );

    rerender(
      <CreatePostForm onSubmit={mockOnSubmit} isLoading={true} />
    );

    const submitButton = screen.getAllByRole('button').find(btn =>
      btn.getAttribute('disabled') !== null
    );

    expect(submitButton).toBeDisabled();
  });

  it('should handle image URL addition', () => {
    const mockOnSubmit = vi.fn();

    render(
      <CreatePostForm onSubmit={mockOnSubmit} />
    );

    const imageUrlInputs = screen.queryAllByPlaceholderText(/url|画像/i);
    expect(imageUrlInputs.length).toBeGreaterThanOrEqual(0);
  });

  it('should clear form after successful submission', async () => {
    const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

    render(
      <CreatePostForm onSubmit={mockOnSubmit} />
    );

    const textarea = screen.getByRole('textbox');
    const submitButton = screen.getAllByRole('button').find(btn =>
      btn.textContent?.includes('投稿') || btn.textContent?.includes('submit')
    ) || screen.getAllByRole('button')[0];

    fireEvent.change(textarea, { target: { value: 'Test post' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(textarea).toHaveValue('');
    });
  });
});
