import { useNavigate, useParams } from "react-router";
import { useFollowList } from "../hooks/useFollowList";
import { UserCard } from "../ui/components/UserCard";
import { Pager } from "../ui/components/Pager";
import { EmptyState } from "../ui/components/EmptyState";
import { AsyncView } from "../ui/components/AsyncView";
import { Button } from "../ui/primitives/Button";

interface Props {
  kind: "followers" | "following";
}

export function FollowListRoute({ kind }: Props) {
  const navigate = useNavigate();
  const params = useParams();
  const sub = params.sub ?? null;
  const list = useFollowList(kind, sub);

  if (!sub) return <p>ユーザー ID がありません</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Button variant="ghost" onClick={() => navigate(`/users/${sub}`)}>
          ← プロフィールに戻る
        </Button>
        <h1>{kind === "followers" ? "フォロワー" : "フォロー中"}</h1>
      </div>
      <AsyncView
        loading={list.loading}
        error={list.error}
        isEmpty={list.items.length === 0}
        emptyFallback={
          <EmptyState
            title={
              kind === "followers"
                ? "フォロワーはいません"
                : "フォロー中のユーザーはいません"
            }
          />
        }
      >
        {list.items.map((u) => (
          <UserCard
            key={u.sub}
            user={u}
            onOpen={() => navigate(`/users/${u.sub}`)}
          />
        ))}
        <Pager
          hasMore={list.nextCursor !== null}
          loading={list.loadingMore}
          onLoadMore={list.loadMore}
        />
      </AsyncView>
    </div>
  );
}
