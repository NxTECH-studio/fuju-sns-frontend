// Fuju backend API types.
// Primary source: ../../backend/docs/swagger.yaml
// Kept as a hand-written mirror to avoid code-gen dependencies.
// These types are internal to the logic layer — do not import from ui/.

export type ULID = string;
export type Timestamp = string;

// ---- Errors ----
export interface ApiErrorPayload {
  code: string;
  message: string;
  timestamp: Timestamp;
}

// ---- Common ----
export interface Badge {
  id: ULID;
  key: string;
  label: string;
  description?: string;
  icon_url: string;
  color: string;
  priority: number;
}

// ---- Users ----
export interface PublicUser {
  sub: ULID;
  display_name: string;
  display_id: string;
  icon_url: string;
  bio: string;
  banner_url: string;
  badges: Badge[];
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at?: string | null;
  profile_refreshed_at: Timestamp;
}

export interface SelfUser extends PublicUser {
  is_admin: boolean;
}

export interface PublicUserEnvelope {
  data: PublicUser;
}
export interface SelfUserEnvelope {
  data: SelfUser;
}
export interface UserListResponse {
  data: PublicUser[];
  limit: number;
  offset: number;
  total: number;
}

export interface UpdateUserProfileRequest {
  bio?: string | null;
  banner_url?: string | null;
}

// ---- Posts ----
export interface PostAuthor {
  sub: ULID;
  display_name_cached: string;
  display_id_cached: string;
  icon_url_cached: string;
}

export interface PostImage {
  id: ULID;
  public_url: string;
  position: number;
}

export interface PostTag {
  id: ULID;
  name: string;
}

export interface PostOGPPreview {
  url: string;
  title: string;
  description: string;
  image_url: string;
  site_name: string;
  canonical_url: string;
}

export interface Post {
  id: ULID;
  user_id: ULID;
  content: string;
  parent_post_id: ULID | null;
  root_post_id: ULID | null;
  likes_count: number;
  replies_count: number;
  visibility: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  images: PostImage[];
  tags: PostTag[];
  author: PostAuthor | null;
  ogp_previews: PostOGPPreview[];
  liked_by_viewer: boolean;
  following_author: boolean;
}

export interface PostListResponse {
  data: Post[];
  next_cursor: string | null;
}
export interface PostDetailEnvelope {
  data: Post;
}

export interface CreatePostRequest {
  content: string;
  image_ids?: ULID[];
  parent_post_id?: ULID | null;
}

// ---- Follows ----
export interface FollowResult {
  following: boolean;
  followers_count: number;
}
export interface FollowResultEnvelope {
  data: FollowResult;
}
export interface FollowListResponse {
  data: PublicUser[];
  next_cursor: string | null;
}

// ---- Images ----
export interface Image {
  id: ULID;
  file_name: string;
  mime_type: string;
  file_size: number;
  public_url: string;
  user_id: ULID;
  created_at: Timestamp;
  updated_at: Timestamp;
  deleted_at?: string | null;
}
export interface ImageEnvelope {
  data: Image;
}
export interface ImageListResponse {
  data: Image[];
  limit: number;
  offset: number;
  total: number;
}

// ---- Badges (admin) ----
export interface BadgeEnvelope {
  data: Badge;
}
export interface BadgeListEnvelope {
  data: Badge[];
}
export interface GrantBadgeEnvelope {
  data: {
    status: "granted";
    user_id: ULID;
    badge: Badge;
  };
}
export interface CreateBadgeRequest {
  key: string;
  label: string;
  description?: string;
  icon_url?: string;
  color: string;
  priority: number;
}
export interface UpdateBadgeRequest {
  label?: string;
  description?: string;
  icon_url?: string;
  color?: string;
  priority?: number;
}
export interface GrantBadgeRequest {
  badge_key: string;
  expires_at?: string | null;
  reason?: string;
}

// ---- /v1/{tenant}/events (telemetry → fuju-emotion-model, direct) ----
// Whitelist of event_types the frontend can legitimately emit. Server-
// side hooks (like / follow / comment / share / save / unsave) are
// emitted by the SNS backend's commit hooks; this endpoint is only for
// view-stream signals captured in the client.
export type FrontendEventType =
  | "view_start"
  | "view_end"
  | "scroll_stop"
  | "rewind";

export interface MeEventInput {
  // The model derives user_id from the AuthCore Bearer's ``sub`` claim
  // server-side (spoofing-proof). The wire payload no longer carries
  // user_id from the client; the previous placeholder was removed once
  // fuju-emotion-model gained the introspection-based override.
  item_id: string;
  event_type: FrontendEventType;
  // ISO 8601 UTC timestamp captured at the moment the user-visible
  // signal occurred (NOT the moment we POST). The frontend buffers
  // events and flushes asynchronously, so this matters.
  timestamp: string;
  // view_end only — total watched seconds in this session. Required
  // for view_end (the model rejects 400 otherwise).
  duration_seconds?: number;
  // view_end only — final playback position. For static images use
  // duration_seconds=position_seconds (completion = 1.0 then).
  position_seconds?: number;
  metadata?: Record<string, unknown>;
}

export interface MeEventsBatch {
  events: MeEventInput[];
}

export interface MeEventsResponse {
  accepted: number;
}
