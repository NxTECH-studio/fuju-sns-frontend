import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useAuthStatus } from "fuju-auth-react";
import { useUserProfile } from "../hooks/useUserProfile";
import { useMeReady } from "../hooks/useMeReady";
import { useTimelineController } from "../hooks/useTimelineController";
import { UserProfileView } from "../ui/components/UserProfileView";
import { FollowControl } from "./FollowControl";
import { PostRow } from "./PostRow";
import { Pager } from "../ui/components/Pager";
import { EmptyState } from "../ui/components/EmptyState";
import { AsyncView } from "../ui/components/AsyncView";
import { ErrorMessage } from "../ui/components/ErrorMessage";
import { Button } from "../ui/primitives/Button";

export function UserProfileRoute() {
  const navigate = useNavigate();
  const params = useParams();
  const sub = params.sub ?? null;
  const { status } = useAuthStatus();
  const me = useMeReady();
  const profile = useUserProfile(sub);
  const ctrl = useTimelineController("user", sub ?? undefined);
  const [followersCount, setFollowersCount] = useState<number | null>(null);

  if (!sub) return <p>ユーザー ID がありません</p>;
  if (profile.loading) return <p>読み込み中...</p>;
  if (profile.error) return <ErrorMessage message={profile.error} />;
  if (!profile.user) return <p>ユーザーが見つかりません</p>;

  const user = profile.user;
  const meSub = me?.sub ?? null;
  const isSelf = meSub === user.sub;
  // Swagger does not include follow state on GET /users/:sub; infer from
  // the first post in the user's timeline. Until the timeline settles we
  // do not know the state, so the button is hidden.
  const firstPost = ctrl.timeline.items[0];
  const timelineReady = !ctrl.timeline.loading && !ctrl.timeline.error;
  const inferredFollowing = firstPost?.followingAuthor ?? false;
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
      <Button onClick={() => navigate("/settings/profile")}>
        プロフィール編集
      </Button>
    ) : null;

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
      <AsyncView
        loading={ctrl.timeline.loading}
        error={ctrl.timeline.error}
        isEmpty={ctrl.timeline.items.length === 0}
        emptyFallback={<EmptyState title="投稿はまだありません" />}
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
