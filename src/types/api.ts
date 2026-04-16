/**
 * API リクエスト・レスポンス型定義
 * バックエンド API との通信で使用する型
 */

import type { User, Post, Comment, PaginatedResponse } from './domain';

// ========== 認証関連 ==========
export interface OAuthAuthorizeRequest {
  provider: 'google' | 'github';
  redirect_uri: string;
}

export interface OAuthAuthorizeResponse {
  redirect_url: string;
}

export interface OAuthCallbackRequest {
  code: string;
  state: string;
  device_type: 'web' | 'mobile';
}

export interface OAuthCallbackResponse {
  user: User;
  session_id?: string;
}

export interface LogoutResponse {
  message: string;
}

// ========== ユーザー関連 ==========
export interface GetUsersRequest {
  limit?: number;
  offset?: number;
}

export type GetUsersResponse = PaginatedResponse<User>;

export interface GetUserResponse {
  data: User;
}

export interface CreateUserRequest {
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string;
}

export interface CreateUserResponse {
  data: User;
}

export interface UpdateUserRequest {
  display_name?: string;
  bio?: string;
  avatar_url?: string;
}

export interface UpdateUserResponse {
  data: User;
}

// ========== 投稿関連 ==========
export interface GetPostsRequest {
  limit?: number;
  offset?: number;
}

export type GetPostsResponse = PaginatedResponse<Post>;

export interface GetPostResponse {
  data: Post;
}

export interface CreatePostRequest {
  content: string;
  image_urls?: string[];
}

export interface CreatePostResponse {
  data: Post;
}

export interface DeletePostResponse {
  message: string;
}

// ========== コメント関連 ==========
export interface GetCommentsRequest {
  post_id: number;
  limit?: number;
  offset?: number;
}

export type GetCommentsResponse = PaginatedResponse<Comment>;

export interface CreateCommentRequest {
  content: string;
}

export interface CreateCommentResponse {
  data: Comment;
}

export interface DeleteCommentResponse {
  message: string;
}
