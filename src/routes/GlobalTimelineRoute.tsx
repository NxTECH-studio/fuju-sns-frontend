import { useNavigate } from 'react-router';
import { useTimeline } from '../hooks/useTimeline';
import { useMe } from '../hooks/useMe';
import { usePostActions } from '../hooks/usePostActions';
import { useToast } from '../state/toastContext';
import { PostRow } from './PostRow';
import { Pager } from '../ui/components/Pager';
import { EmptyState } from '../ui/components/EmptyState';

export function GlobalTimelineRoute() {
  const navigate = useNavigate();
  const me = useMe();
  const timeline = useTimeline('global');
  const actions = usePostActions();
  const toast = useToast();

  const meSub = me.status === 'ready' ? me.me.sub : null;

  const handleDelete = async (id: string) => {
    if (!window.confirm('この投稿を削除しますか？')) return;
    try {
      await actions.remove(id);
      timeline.removeById((p) => p.id === id);
      toast.show('投稿を削除しました', 'success');
    } catch (e) {
      toast.show(e instanceof Error ? e.message : '削除に失敗しました', 'error');
    }
  };

  if (timeline.loading) return <p>読み込み中...</p>;
  if (timeline.error) return <p style={{ color: '#d33' }}>エラー: {timeline.error}</p>;

  if (timeline.items.length === 0) {
    return <EmptyState title="まだ投稿がありません" />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h1>Global</h1>
      {timeline.items.map((p) => (
        <PostRow
          key={p.id}
          post={p}
          meSub={meSub}
          onOpen={() => navigate(`/posts/${p.id}`)}
          onOpenAuthor={p.author ? () => navigate(`/users/${p.author!.sub}`) : undefined}
          onDelete={() => void handleDelete(p.id)}
          onLikeChange={(next) =>
            timeline.updateById(
              (x) => x.id === p.id,
              (x) => ({ ...x, likedByViewer: next.liked, likesCount: next.count }),
            )
          }
        />
      ))}
      <Pager
        hasMore={timeline.nextCursor !== null}
        loading={timeline.loadingMore}
        onLoadMore={timeline.loadMore}
      />
    </div>
  );
}
