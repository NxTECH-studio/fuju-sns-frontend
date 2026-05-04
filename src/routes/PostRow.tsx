import { useCallback } from "react";
import type { PostVM } from "../types/vm";
import { useLikeToggle } from "../hooks/useLikeToggle";
import { useImpressionTracker } from "../hooks/useImpressionTracker";
import { useAuthStatus } from "fuju-auth-react";
import { PostCard } from "../ui/components/PostCard";
import { LikeButton } from "../ui/components/LikeButton";
import { useToast } from "../state/toastContext";

interface PostRowProps {
  post: PostVM;
  meSub: string | null;
  onOpen?: () => void;
  onOpenAuthor?: () => void;
  onDelete?: () => void;
  onLikeChange?: (next: { liked: boolean; count: number }) => void;
  showReplyMeta?: boolean;
}

export function PostRow({
  post,
  meSub,
  onOpen,
  onOpenAuthor,
  onDelete,
  onLikeChange,
  showReplyMeta,
}: PostRowProps) {
  const { status } = useAuthStatus();
  const toast = useToast();
  const like = useLikeToggle(
    post.id,
    post.likedByViewer,
    post.likesCount,
    onLikeChange
  );
  // view_*/scroll_stop telemetry. The hook attaches an
  // IntersectionObserver to the PostCard's outer <article> via the
  // rootRef prop and emits events through the TelemetryProvider.
  // Authenticated routes get a real provider; public routes fall back
  // to the no-op sink in useTelemetry.
  const impressionRef = useImpressionTracker(post.id);

  const toggle = useCallback(async () => {
    try {
      await like.toggle();
    } catch (e) {
      toast.show(
        e instanceof Error ? e.message : "いいねに失敗しました",
        "error"
      );
    }
  }, [like, toast]);

  const canLike = status === "authenticated";

  return (
    <PostCard
      post={post}
      rootRef={impressionRef}
      onOpen={onOpen}
      onOpenAuthor={onOpenAuthor}
      onDelete={onDelete}
      canDelete={meSub !== null && post.userId === meSub}
      showReplyMeta={showReplyMeta}
      likeSlot={
        <LikeButton
          liked={like.liked}
          count={like.count}
          disabled={!canLike || like.pending}
          onToggle={() => void toggle()}
        />
      }
    />
  );
}
