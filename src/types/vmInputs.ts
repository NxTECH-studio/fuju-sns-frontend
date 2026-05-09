// VM input types. Routes talk to hooks in camelCase via these shapes, and
// services/inputMappers handles the conversion to swagger snake_case.

export interface CreatePostInput {
  content: string;
  parentPostId?: string | null;
}

export interface UpdateProfileInput {
  bio?: string | null;
  bannerUrl?: string | null;
}

export interface CreateBadgeInput {
  key: string;
  label: string;
  description?: string;
  iconUrl?: string;
  color: string;
  priority: number;
}

export interface UpdateBadgeInput {
  label?: string;
  description?: string;
  iconUrl?: string;
  color?: string;
  priority?: number;
}

export interface GrantBadgeInput {
  badgeKey: string;
  expiresAt?: string | null;
  reason?: string;
}
