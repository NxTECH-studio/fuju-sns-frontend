import type {
  Badge,
  FollowResult,
  Image,
  Post,
  PostAuthor,
  PostImage,
  PostOGPPreview,
  PostTag,
  PublicUser,
  SelfUser,
} from "../api/types";
import type {
  AuthorVM,
  BadgeVM,
  FollowResultVM,
  ImageVM,
  MeVM,
  OGPPreviewVM,
  PostImageVM,
  PostTagVM,
  PostVM,
  UserVM,
} from "./vm";

export function toBadgeVM(b: Badge): BadgeVM {
  return {
    id: b.id,
    key: b.key,
    label: b.label,
    description: b.description ?? "",
    iconUrl: b.icon_url,
    color: b.color,
    priority: b.priority,
  };
}

export function toUserVM(u: PublicUser): UserVM {
  return {
    sub: u.sub,
    displayName: u.display_name,
    displayId: u.display_id,
    iconUrl: u.icon_url,
    bio: u.bio,
    bannerUrl: u.banner_url,
    badges: u.badges.map(toBadgeVM),
    createdAt: u.created_at,
    profileRefreshedAt: u.profile_refreshed_at,
  };
}

export function toMeVM(u: SelfUser): MeVM {
  return {
    ...toUserVM(u),
    isAdmin: u.is_admin,
  };
}

export function toAuthorVM(a: PostAuthor): AuthorVM {
  return {
    sub: a.sub,
    displayName: a.display_name_cached,
    displayId: a.display_id_cached,
    iconUrl: a.icon_url_cached,
  };
}

function toPostImageVM(i: PostImage): PostImageVM {
  return { id: i.id, publicUrl: i.public_url, position: i.position };
}

function toPostTagVM(t: PostTag): PostTagVM {
  return { id: t.id, name: t.name };
}

function toOGPPreviewVM(o: PostOGPPreview): OGPPreviewVM {
  return {
    url: o.url,
    title: o.title,
    description: o.description,
    imageUrl: o.image_url,
    siteName: o.site_name,
    canonicalUrl: o.canonical_url,
  };
}

export function toPostVM(p: Post): PostVM {
  return {
    id: p.id,
    userId: p.user_id,
    content: p.content,
    parentPostId: p.parent_post_id,
    rootPostId: p.root_post_id,
    likesCount: p.likes_count,
    repliesCount: p.replies_count,
    visibility: p.visibility,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    images: p.images.map(toPostImageVM),
    tags: p.tags.map(toPostTagVM),
    author: p.author ? toAuthorVM(p.author) : null,
    ogpPreviews: p.ogp_previews.map(toOGPPreviewVM),
    likedByViewer: p.liked_by_viewer,
    followingAuthor: p.following_author,
  };
}

export function toImageVM(i: Image): ImageVM {
  return {
    id: i.id,
    fileName: i.file_name,
    mimeType: i.mime_type,
    fileSize: i.file_size,
    publicUrl: i.public_url,
    userId: i.user_id,
    createdAt: i.created_at,
  };
}

export function toFollowResultVM(f: FollowResult): FollowResultVM {
  return {
    following: f.following,
    followersCount: f.followers_count,
  };
}
