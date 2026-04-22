import { useNavigate } from "react-router";
import { useTimeline } from "../hooks/useTimeline";
import { useMe } from "../hooks/useMe";
import { useAuthStatus } from "fuju-auth-react";
import { usePostActions } from "../hooks/usePostActions";
import { useToast } from "../state/toastContext";
import { PostRow } from "./PostRow";
import { ComposerBox } from "./ComposerBox";
import { Pager } from "../ui/components/Pager";
import { EmptyState } from "../ui/components/EmptyState";
import { ErrorMessage } from "../ui/components/ErrorMessage";
import { Button } from "../ui/primitives/Button";

export function HomeTimelineRoute() {
  const navigate = useNavigate();
  const { status } = useAuthStatus();
  const me = useMe();
  const timeline = useTimeline("home");
  const actions = usePostActions();
  const toast = useToast();

  if (status !== "authenticated") {
    return (
      <EmptyState
        title="ログインが必要です"
        description="Home timeline はフォローしている人の投稿を表示します。"
        action={
          <Button variant="primary" onClick={() => navigate("/login")}>
            ログイン
          </Button>
        }
      />
    );
  }

  const meSub = me.status === "ready" ? me.me.sub : null;

  const handleCreate = async (input: {
    content: string;
    imageIds?: string[];
    parentPostId?: string | null;
  }) => {
    const vm = await actions.create({
      content: input.content,
      image_ids: input.imageIds,
      parent_post_id: input.parentPostId ?? null,
    });
    timeline.prepend(vm);
    toast.show("投稿しました", "success");
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("この投稿を削除しますか？")) return;
    try {
      await actions.remove(id);
      timeline.removeById((p) => p.id === id);
      toast.show("投稿を削除しました", "success");
    } catch (e) {
      toast.show(
        e instanceof Error ? e.message : "削除に失敗しました",
        "error"
      );
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h1>Home</h1>
      <ComposerBox onSubmit={handleCreate} />
      {timeline.loading ? (
        <p>読み込み中...</p>
      ) : timeline.error ? (
        <ErrorMessage message={timeline.error} />
      ) : timeline.items.length === 0 ? (
        <EmptyState
          title="まだ投稿がありません"
          description="誰かをフォローするか、Global タイムラインをのぞいてみてください。"
          action={
            <Button onClick={() => navigate("/global")}>Global を見る</Button>
          }
        />
      ) : (
        <>
          {timeline.items.map((p) => (
            <PostRow
              key={p.id}
              post={p}
              meSub={meSub}
              onOpen={() => navigate(`/posts/${p.id}`)}
              onOpenAuthor={
                p.author ? () => navigate(`/users/${p.author!.sub}`) : undefined
              }
              onDelete={() => void handleDelete(p.id)}
              onLikeChange={(next) =>
                timeline.updateById(
                  (x) => x.id === p.id,
                  (x) => ({
                    ...x,
                    likedByViewer: next.liked,
                    likesCount: next.count,
                  })
                )
              }
            />
          ))}
          <Pager
            hasMore={timeline.nextCursor !== null}
            loading={timeline.loadingMore}
            onLoadMore={timeline.loadMore}
          />
        </>
      )}
    </div>
  );
}
