import { useNavigate, useParams } from 'react-router';
import { useFollowList } from '../hooks/useFollowList';
import { UserCard } from '../ui/components/UserCard';
import { Pager } from '../ui/components/Pager';
import { EmptyState } from '../ui/components/EmptyState';
import { Button } from '../ui/primitives/Button';

interface Props {
  kind: 'followers' | 'following';
}

export function FollowListRoute({ kind }: Props) {
  const navigate = useNavigate();
  const params = useParams();
  const sub = params.sub ?? null;
  const list = useFollowList(kind, sub);

  if (!sub) return <p>ユーザー ID がありません</p>;
  if (list.loading) return <p>読み込み中...</p>;
  if (list.error) return <p style={{ color: '#d33' }}>エラー: {list.error}</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Button variant="ghost" onClick={() => navigate(`/users/${sub}`)}>
          ← プロフィールに戻る
        </Button>
        <h1>{kind === 'followers' ? 'フォロワー' : 'フォロー中'}</h1>
      </div>
      {list.items.length === 0 ? (
        <EmptyState
          title={kind === 'followers' ? 'フォロワーはいません' : 'フォロー中のユーザーはいません'}
        />
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
