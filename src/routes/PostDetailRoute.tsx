import { useNavigate, useParams } from "react-router";
import { usePostDetail } from "../hooks/usePostDetail";
import { useMe } from "../hooks/useMe";
import { useAuthStatus } from "fuju-auth-react";
import { usePostActions } from "../hooks/usePostActions";
import { useToast } from "../state/toastContext";
import { PostRow } from "./PostRow";
import { ComposerBox } from "./ComposerBox";
import { Pager } from "../ui/components/Pager";
import { ErrorMessage } from "../ui/components/ErrorMessage";
import { Button } from "../ui/primitives/Button";

export function PostDetailRoute() {
  const params = useParams();
  const id = params.id ?? "";
  const navigate = useNavigate();
  const me = useMe();
  const { status } = useAuthStatus();
  const detail = usePostDetail(id);
  const actions = usePostActions();
  const toast = useToast();

  if (!id) return <p>投稿 ID がありません</p>;
  if (detail.loading) return <p>読み込み中...</p>;
  if (detail.error) return <ErrorMessage message={detail.error} />;
  if (!detail.post) return <p>投稿が見つかりません</p>;

  const meSub = me.status === "ready" ? me.me.sub : null;

  const handleReply = async (input: {
    content: string;
    imageIds?: string[];
    parentPostId?: string | null;
  }) => {
    const vm = await actions.create({
      content: input.content,
      image_ids: input.imageIds,
      parent_post_id: id,
    });
    detail.appendReply(vm);
    toast.show("返信しました", "success");
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm("この投稿を削除しますか？")) return;
    try {
      await actions.remove(postId);
      if (postId === id) {
        toast.show("投稿を削除しました", "success");
        navigate(-1);
      } else {
        detail.removeReply(postId);
        toast.show("返信を削除しました", "success");
      }
    } catch (e) {
      toast.show(
        e instanceof Error ? e.message : "削除に失敗しました",
        "error"
      );
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Button variant="ghost" onClick={() => navigate(-1)}>
          ← 戻る
        </Button>
        <h1 style={{ flex: 1 }}>投稿</h1>
        <Button onClick={detail.refresh}>更新（OGP 再取得）</Button>
      </div>
      <PostRow
        post={detail.post}
        meSub={meSub}
        onOpenAuthor={
          detail.post.author
            ? () => navigate(`/users/${detail.post!.author!.sub}`)
            : undefined
        }
        onDelete={() => void handleDeletePost(detail.post!.id)}
        onLikeChange={(next) =>
          detail.updatePost((p) => ({
            ...p,
            likedByViewer: next.liked,
            likesCount: next.count,
          }))
        }
      />

      {status === "authenticated" ? (
        <ComposerBox placeholder="返信を書く..." onSubmit={handleReply} />
      ) : null}

      <h2>返信 ({detail.post.repliesCount})</h2>
      {detail.replies.length === 0 ? (
        <p style={{ color: "var(--text)" }}>返信はまだありません</p>
      ) : (
        detail.replies.map((r) => (
          <PostRow
            key={r.id}
            post={r}
            meSub={meSub}
            onOpen={() => navigate(`/posts/${r.id}`)}
            onOpenAuthor={
              r.author ? () => navigate(`/users/${r.author!.sub}`) : undefined
            }
            onDelete={() => void handleDeletePost(r.id)}
            showReplyMeta
          />
        ))
      )}
      <Pager
        hasMore={detail.repliesNextCursor !== null}
        loading={detail.loadingReplies}
        onLoadMore={detail.loadMoreReplies}
      />
    </div>
  );
}
