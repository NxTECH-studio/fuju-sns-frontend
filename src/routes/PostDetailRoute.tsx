import { useCallback } from "react";
import { useNavigate, useParams } from "react-router";
import { useAuthStatus } from "../auth-component/src";
import { useMeReady } from "../hooks/useMeReady";
import { usePostDetailController } from "../hooks/usePostDetailController";
import { PostRow } from "./PostRow";
import { ComposerBox } from "./ComposerBox";
import { Pager } from "../ui/components/Pager";
import { ErrorMessage } from "../ui/components/ErrorMessage";
import { Button } from "../ui/primitives/Button";

export function PostDetailRoute() {
  const params = useParams();
  const id = params.id ?? "";
  const navigate = useNavigate();
  const me = useMeReady();
  const { status } = useAuthStatus();
  const ctrl = usePostDetailController(id);

  const onPrimaryDeleted = useCallback(() => navigate(-1), [navigate]);

  if (!id) return <p>投稿 ID がありません</p>;
  if (ctrl.detail.loading) return <p>読み込み中...</p>;
  if (ctrl.detail.error) return <ErrorMessage message={ctrl.detail.error} />;
  if (!ctrl.detail.post) return <p>投稿が見つかりません</p>;

  const post = ctrl.detail.post;
  const meSub = me?.sub ?? null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Button variant="ghost" onClick={() => navigate(-1)}>
          ← 戻る
        </Button>
        <h1 style={{ flex: 1 }}>投稿</h1>
        <Button onClick={ctrl.detail.refresh}>更新（OGP 再取得）</Button>
      </div>
      <PostRow
        post={post}
        meSub={meSub}
        onOpenAuthor={
          post.author ? () => navigate(`/users/${post.author!.sub}`) : undefined
        }
        onDelete={() => void ctrl.onDelete(post.id, id, onPrimaryDeleted)}
        onLikeChange={(next) =>
          ctrl.detail.updatePost((p) => ({
            ...p,
            likedByViewer: next.liked,
            likesCount: next.count,
          }))
        }
      />

      {status === "authenticated" ? (
        <ComposerBox placeholder="返信を書く..." onSubmit={ctrl.onReply} />
      ) : null}

      <h2>返信 ({post.repliesCount})</h2>
      {ctrl.detail.replies.length === 0 ? (
        <p style={{ color: "var(--text)" }}>返信はまだありません</p>
      ) : (
        ctrl.detail.replies.map((r) => (
          <PostRow
            key={r.id}
            post={r}
            meSub={meSub}
            onOpen={() => navigate(`/posts/${r.id}`)}
            onOpenAuthor={
              r.author ? () => navigate(`/users/${r.author!.sub}`) : undefined
            }
            onDelete={() => void ctrl.onDelete(r.id, id, onPrimaryDeleted)}
            showReplyMeta
          />
        ))
      )}
      <Pager
        hasMore={ctrl.detail.repliesNextCursor !== null}
        loading={ctrl.detail.loadingReplies}
        onLoadMore={ctrl.detail.loadMoreReplies}
      />
    </div>
  );
}
