/**
 * ドメイン型定義
 * User, Post, Comment などのビジネスロジックに関連する型
 */

export interface User {
  id: number;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: number;
  user_id: number;
  content: string;
  image_urls: string[];
  created_at: string;
  updated_at: string;
  user?: User;
  comments_count?: number;
  likes_count?: number;
}

export interface Comment {
  id: number;
  post_id: number;
  user_id: number;
  content: string;
  created_at: string;
  updated_at: string;
  user?: User;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface ApiErrorResponse {
  code: string;
  message: string;
  timestamp: string;
}
