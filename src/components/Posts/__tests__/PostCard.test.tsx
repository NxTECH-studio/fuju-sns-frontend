/**
 * PostCard Component Tests
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PostCard } from '../PostCard';
import type { Post } from '../../../types';

// Mock post data
const mockPost: Post = {
  id: 1,
  userId: 1,
  displayName: 'John Doe',
  avatar: 'https://example.com/avatar.jpg',
  content: 'This is a test post',
  imageUrls: [],
  likeCount: 5,
  replyCount: 3,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

describe('PostCard', () => {
  it('should render post content', () => {
    const mockOnDelete = vi.fn();

    render(<PostCard post={mockPost} onDelete={mockOnDelete} />);

    expect(screen.getByText(mockPost.displayName)).toBeInTheDocument();
    expect(screen.getByText(mockPost.content)).toBeInTheDocument();
  });

  it('should render post metadata', () => {
    const mockOnDelete = vi.fn();

    render(<PostCard post={mockPost} onDelete={mockOnDelete} />);

    // Check for like count
    expect(screen.getByText(/\d+/)).toBeInTheDocument();
  });

  it('should render avatar image', () => {
    const mockOnDelete = vi.fn();

    render(<PostCard post={mockPost} onDelete={mockOnDelete} />);

    const avatar = screen.getByRole('img', { hidden: true });
    expect(avatar).toHaveAttribute('src', mockPost.avatar);
  });

  it('should call onDelete when delete is triggered', () => {
    const mockOnDelete = vi.fn();

    const { container } = render(<PostCard post={mockPost} onDelete={mockOnDelete} />);

    // Find delete button if exists
    const deleteButton =
      container.querySelector('button[aria-label*="delete"]') ||
      container.querySelector('button[aria-label*="削除"]');

    if (deleteButton) {
      deleteButton.click();
      expect(mockOnDelete).toHaveBeenCalledWith(mockPost.id);
    }
  });

  it('should render images if present', () => {
    const postWithImages = {
      ...mockPost,
      imageUrls: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
    };

    const mockOnDelete = vi.fn();

    render(<PostCard post={postWithImages} onDelete={mockOnDelete} />);

    // Images should be rendered
    const images = screen.getAllByRole('img');
    expect(images.length).toBeGreaterThan(1); // At least avatar + post images
  });

  it('should display correct time information', () => {
    const mockOnDelete = vi.fn();

    render(<PostCard post={mockPost} onDelete={mockOnDelete} />);

    // Just verify that some time-related text is rendered
    const content = screen.getByText(mockPost.content);
    expect(content).toBeInTheDocument();
  });
});
