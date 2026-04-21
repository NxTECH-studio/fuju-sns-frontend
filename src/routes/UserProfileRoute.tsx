import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useAuthStatus } from "../auth-component/src";
import { useUserProfile } from "../hooks/useUserProfile";
import { useTimeline } from "../hooks/useTimeline";
import { useMe } from "../hooks/useMe";
import { usePostActions } from "../hooks/usePostActions";
import { useToast } from "../state/toastContext";
import { UserProfileView } from "../ui/components/UserProfileView";
import { FollowControl } from "./FollowControl";
import { PostRow } from "./PostRow";
import { Pager } from "../ui/components/Pager";
import { EmptyState } from "../ui/components/EmptyState";
import { ErrorMessage } from "../ui/components/ErrorMessage";
import { Button } from "../ui/primitives/Button";

export function UserProfileRoute() {
  const navigate = useNavigate();
  const params = useParams();
  const sub = params.sub ?? null;
  const { status } = useAuthStatus();
  const me = useMe();
  const profile = useUserProfile(sub);
  const timeline = useTimeline("user", sub ?? undefined);
  const toast = useToast();
  const actions = usePostActions();
  const [followersCount, setFollowersCount] = useState<number | null>(null);

  if (!sub) return <p>ユーザー ID がありません</p>;
  if (profile.loading) return <p>読み込み中...</p>;
  if (profile.error) return <ErrorMessage message={profile.error} />;
  if (!profile.user) return <p>ユーザーが見つかりません</p>;

  const user = profile.user;
  const meSub = me.status === "ready" ? me.me.sub : null;
  const isSelf = meSub === user.sub;
  // Swagger does not include follow state on GET /users/:sub; infer from
  // the first post in the user's timeline. Until the timeline settles
  // we do not know the state, so the button is hidden.
  const firstPost = timeline.items[0];
  const timelineReady = !timeline.loading && !timeline.error;
  const inferredFollowing = firstPost?.followingAuthor ?? false;
  // Re-mount FollowControl when timeline readiness or inferred value
  // changes so the initial seed is accurate.
  const followKey = timelineReady
    ? `ready-${inferredFollowing ? 1 : 0}`
    : "pending";

  const followAction =
    !isSelf && status === "authenticated" && timelineReady ? (
      <FollowControl
        key={followKey}
        sub={sub}
        initialFollowing={inferredFollowing}
        initialFollowersCount={0}
        onCountChange={({ followersCount: c }) => setFollowersCount(c)}
      />
    ) : isSelf ? (
      <Button onClick={() => navigate("/me/edit")}>プロフィール編集</Button>
    ) : null;

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
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <UserProfileView
        user={user}
        followersCount={followersCount}
        actions={followAction}
        onOpenFollowers={() => navigate(`/users/${user.sub}/followers`)}
        onOpenFollowing={() => navigate(`/users/${user.sub}/following`)}
      />
      <h2>投稿</h2>
      {timeline.loading ? (
        <p>読み込み中...</p>
      ) : timeline.error ? (
        <ErrorMessage message={timeline.error} />
      ) : timeline.items.length === 0 ? (
        <EmptyState title="投稿はまだありません" />
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
