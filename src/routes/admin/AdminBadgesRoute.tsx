import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { useMe } from '../../hooks/useMe';
import { useAdminBadges } from '../../hooks/useAdminBadges';
import { useToast } from '../../state/toastContext';
import { BadgeChip } from '../../ui/components/BadgeChip';
import { BadgeForm } from '../../ui/components/BadgeForm';
import { Button } from '../../ui/primitives/Button';
import type { BadgeVM } from '../../services/vm';

export function AdminBadgesRoute() {
  const navigate = useNavigate();
  const me = useMe();
  const admin = useAdminBadges();
  const toast = useToast();
  const [editing, setEditing] = useState<BadgeVM | null>(null);
  const [creating, setCreating] = useState(false);

  if (me.status === 'loading' || me.status === 'idle') return <p>読み込み中...</p>;
  if (me.status !== 'ready' || !me.me.isAdmin) return <Navigate to="/" replace />;
  if (admin.loading) return <p>読み込み中...</p>;
  if (admin.error) return <p style={{ color: '#d33' }}>エラー: {admin.error}</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h1 style={{ flex: 1 }}>Admin / バッジ</h1>
        <Button onClick={() => setCreating((c) => !c)}>
          {creating ? '閉じる' : '新規作成'}
        </Button>
      </div>

      {creating ? (
        <BadgeForm
          onSubmit={async (values) => {
            await admin.create({
              key: values.key,
              label: values.label,
              description: values.description || undefined,
              icon_url: values.iconUrl || undefined,
              color: values.color,
              priority: values.priority,
            });
            toast.show('バッジを作成しました', 'success');
            setCreating(false);
          }}
          onCancel={() => setCreating(false)}
        />
      ) : null}

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {admin.badges.map((b) =>
          editing?.id === b.id ? (
            <li
              key={b.id}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: 12,
                background: 'var(--bg)',
              }}
            >
              <BadgeForm
                initial={b}
                requireKey={false}
                submitLabel="保存"
                onSubmit={async (values) => {
                  await admin.update(b.id, {
                    label: values.label,
                    description: values.description || undefined,
                    icon_url: values.iconUrl || undefined,
                    color: values.color,
                    priority: values.priority,
                  });
                  toast.show('保存しました', 'success');
                  setEditing(null);
                }}
                onCancel={() => setEditing(null)}
              />
            </li>
          ) : (
            <li
              key={b.id}
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'center',
                padding: 10,
                border: '1px solid var(--border)',
                borderRadius: 8,
              }}
            >
              <BadgeChip badge={b} />
              <span style={{ flex: 1, fontSize: 12, color: 'var(--text)' }}>
                key: <code>{b.key}</code> / priority: {b.priority}
              </span>
              <Button onClick={() => setEditing(b)}>編集</Button>
              <Button onClick={() => navigate(`/admin/users`)}>ユーザーに付与</Button>
            </li>
          ),
        )}
      </ul>
      <Button variant="ghost" onClick={() => navigate('/admin/users')}>
        ユーザーへのバッジ管理 →
      </Button>
    </div>
  );
}
