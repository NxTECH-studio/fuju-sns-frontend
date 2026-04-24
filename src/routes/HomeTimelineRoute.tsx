import { useNavigate } from "react-router";
import { useAuthStatus } from "fuju-auth-react";
import { useMeReady } from "../hooks/useMeReady";
import { useTimelineController } from "../hooks/useTimelineController";
import { PostRow } from "./PostRow";
import { ComposerBox } from "./ComposerBox";
import { Pager } from "../ui/components/Pager";
import { EmptyState } from "../ui/components/EmptyState";
import { AsyncView } from "../ui/components/AsyncView";
import { Button } from "../ui/primitives/Button";

export function HomeTimelineRoute() {
  const navigate = useNavigate();
  const { status } = useAuthStatus();
  const me = useMeReady();
  const ctrl = useTimelineController("home");

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

  const meSub = me?.sub ?? null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h1>Home</h1>
      <ComposerBox onSubmit={ctrl.onCreate} />
      <AsyncView
        loading={ctrl.timeline.loading}
        error={ctrl.timeline.error}
        isEmpty={ctrl.timeline.items.length === 0}
        emptyFallback={
          <EmptyState
            title="まだ投稿がありません"
            description="誰かをフォローするか、Global タイムラインをのぞいてみてください。"
            action={
              <Button onClick={() => navigate("/global")}>Global を見る</Button>
            }
          />
        }
      >
        {ctrl.timeline.items.map((p) => (
          <PostRow
            key={p.id}
            post={p}
            meSub={meSub}
            onOpen={() => navigate(`/posts/${p.id}`)}
            onOpenAuthor={
              p.author ? () => navigate(`/users/${p.author!.sub}`) : undefined
            }
            onDelete={() => void ctrl.onDelete(p.id)}
            onLikeChange={(next) => ctrl.onLikeChange(p.id, next)}
          />
        ))}
        <Pager
          hasMore={ctrl.timeline.nextCursor !== null}
          loading={ctrl.timeline.loadingMore}
          onLoadMore={ctrl.timeline.loadMore}
        />
      </AsyncView>
    </div>
  );
}
