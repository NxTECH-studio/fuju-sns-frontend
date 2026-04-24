import type {
  CreateBadgeRequest,
  CreatePostRequest,
  GrantBadgeRequest,
  UpdateBadgeRequest,
  UpdateUserProfileRequest,
} from "../api/types";
import type {
  CreateBadgeInput,
  CreatePostInput,
  GrantBadgeInput,
  UpdateBadgeInput,
  UpdateProfileInput,
} from "../types/vmInputs";

export function fromCreatePostInput(input: CreatePostInput): CreatePostRequest {
  return {
    content: input.content,
    image_ids: input.imageIds,
    parent_post_id: input.parentPostId ?? null,
  };
}

export function fromUpdateProfileInput(
  input: UpdateProfileInput
): UpdateUserProfileRequest {
  return {
    bio: input.bio,
    banner_url: input.bannerUrl,
  };
}

export function fromCreateBadgeInput(
  input: CreateBadgeInput
): CreateBadgeRequest {
  return {
    key: input.key,
    label: input.label,
    description: input.description,
    icon_url: input.iconUrl,
    color: input.color,
    priority: input.priority,
  };
}

export function fromUpdateBadgeInput(
  input: UpdateBadgeInput
): UpdateBadgeRequest {
  return {
    label: input.label,
    description: input.description,
    icon_url: input.iconUrl,
    color: input.color,
    priority: input.priority,
  };
}

export function fromGrantBadgeInput(input: GrantBadgeInput): GrantBadgeRequest {
  return {
    badge_key: input.badgeKey,
    expires_at: input.expiresAt,
    reason: input.reason,
  };
}
