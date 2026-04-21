import type { FujuClient } from '../client';
import type {
  CreatePostRequest,
  PostDetailEnvelope,
  PostListResponse,
  ULID,
} from '../types';

export interface ListPostsQuery {
  cursor?: string;
  limit?: number;
  userId?: ULID;
}

export function listPosts(
  client: FujuClient,
  q: ListPostsQuery = {},
  signal?: AbortSignal,
): Promise<PostListResponse> {
  return client.get<PostListResponse>('/posts', {
    signal,
    query: { cursor: q.cursor, limit: q.limit, user_id: q.userId },
  });
}

export function getPost(
  client: FujuClient,
  id: ULID,
  signal?: AbortSignal,
): Promise<PostDetailEnvelope> {
  return client.get<PostDetailEnvelope>(`/posts/${encodeURIComponent(id)}`, { signal });
}

export function listReplies(
  client: FujuClient,
  postId: ULID,
  q: { cursor?: string; limit?: number } = {},
  signal?: AbortSignal,
): Promise<PostListResponse> {
  return client.get<PostListResponse>(`/posts/${encodeURIComponent(postId)}/replies`, {
    signal,
    query: { cursor: q.cursor, limit: q.limit },
  });
}

export function createPost(
  client: FujuClient,
  input: CreatePostRequest,
  signal?: AbortSignal,
): Promise<PostDetailEnvelope> {
  return client.post<PostDetailEnvelope>('/posts', input, { signal });
}

export function deletePost(
  client: FujuClient,
  id: ULID,
  signal?: AbortSignal,
): Promise<void> {
  return client.del(`/posts/${encodeURIComponent(id)}`, { signal });
}

export function likePost(client: FujuClient, id: ULID, signal?: AbortSignal): Promise<void> {
  return client.post<void>(`/posts/${encodeURIComponent(id)}/like`, undefined, { signal });
}

export function unlikePost(client: FujuClient, id: ULID, signal?: AbortSignal): Promise<void> {
  return client.del(`/posts/${encodeURIComponent(id)}/like`, { signal });
}
