// View models. All types consumed by `ui/` and `routes/` go through here.
// UI must never import from `api/types.ts` directly — that shape is internal
// to the logic layer and subject to swagger changes.
//
// Naming: suffix with `VM` so the UI layer contract is explicit.

export interface BadgeVM {
  id: string;
  key: string;
  label: string;
  description: string;
  iconUrl: string;
  color: string;
  priority: number;
}

export interface AuthorVM {
  sub: string;
  displayName: string;
  displayId: string;
  iconUrl: string;
}

export interface UserVM {
  sub: string;
  displayName: string;
  displayId: string;
  iconUrl: string;
  bio: string;
  bannerUrl: string;
  badges: BadgeVM[];
  createdAt: string;
  profileRefreshedAt: string;
}

export interface MeVM extends UserVM {
  isAdmin: boolean;
}

export interface PostImageVM {
  id: string;
  publicUrl: string;
  position: number;
}

export interface PostTagVM {
  id: string;
  name: string;
}

export interface OGPPreviewVM {
  url: string;
  title: string;
  description: string;
  imageUrl: string;
  siteName: string;
  canonicalUrl: string;
}

export interface PostVM {
  id: string;
  userId: string;
  content: string;
  parentPostId: string | null;
  rootPostId: string | null;
  likesCount: number;
  repliesCount: number;
  visibility: string;
  createdAt: string;
  updatedAt: string;
  images: PostImageVM[];
  tags: PostTagVM[];
  author: AuthorVM | null;
  ogpPreviews: OGPPreviewVM[];
  likedByViewer: boolean;
  followingAuthor: boolean;
}

export interface ImageVM {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  publicUrl: string;
  userId: string;
  createdAt: string;
}

export interface FollowResultVM {
  following: boolean;
  followersCount: number;
}
