import { useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { useMe } from "../../hooks/useMe";
import { useAdminBadges } from "../../hooks/useAdminBadges";
import { useToast } from "../../state/toastContext";
import { BadgeChip } from "../../ui/components/BadgeChip";
import { BadgeForm } from "../../ui/components/BadgeForm";
import { ErrorMessage } from "../../ui/components/ErrorMessage";
import { AsyncView } from "../../ui/components/AsyncView";
import { Button } from "../../ui/primitives/Button";
import type { BadgeVM } from "../../types/vm";
import styles from "./AdminBadges.module.css";

export function AdminBadgesRoute() {
  const navigate = useNavigate();
  const me = useMe();
  const admin = useAdminBadges();
  const toast = useToast();
  const [editing, setEditing] = useState<BadgeVM | null>(null);
  const [creating, setCreating] = useState(false);

  if (me.status === "loading" || me.status === "idle") {
    return <p>読み込み中...</p>;
  }
  if (me.status !== "ready" || !me.me.isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h1>Admin / バッジ</h1>
        <Button onClick={() => setCreating((c) => !c)}>
          {creating ? "閉じる" : "新規作成"}
        </Button>
      </div>

      {creating ? (
        <BadgeForm
          onSubmit={async (values) => {
            await admin.create({
              key: values.key,
              label: values.label,
              description: values.description || undefined,
              iconUrl: values.iconUrl || undefined,
              color: values.color,
              priority: values.priority,
            });
            toast.show("バッジを作成しました", "success");
            setCreating(false);
          }}
          onCancel={() => setCreating(false)}
        />
      ) : null}

      <AsyncView
        loading={admin.loading}
        error={admin.error}
        isEmpty={admin.badges.length === 0}
        emptyFallback={
          <ErrorMessage message="バッジはまだありません" prefix="情報" />
        }
      >
        <ul className={styles.list}>
          {admin.badges.map((b) =>
            editing?.id === b.id ? (
              <li key={b.id} className={styles.editing}>
                <BadgeForm
                  initial={b}
                  requireKey={false}
                  submitLabel="保存"
                  onSubmit={async (values) => {
                    await admin.update(b.id, {
                      label: values.label,
                      description: values.description || undefined,
                      iconUrl: values.iconUrl || undefined,
                      color: values.color,
                      priority: values.priority,
                    });
                    toast.show("保存しました", "success");
                    setEditing(null);
                  }}
                  onCancel={() => setEditing(null)}
                />
              </li>
            ) : (
              <li key={b.id} className={styles.row}>
                <BadgeChip badge={b} />
                <span className={styles.meta}>
                  key: <code>{b.key}</code> / priority: {b.priority}
                </span>
                <Button onClick={() => setEditing(b)}>編集</Button>
                <Button
                  onClick={() =>
                    navigate(`/admin/users?grant=${encodeURIComponent(b.key)}`)
                  }
                >
                  ユーザーに付与
                </Button>
              </li>
            )
          )}
        </ul>
      </AsyncView>
      <Button variant="ghost" onClick={() => navigate("/admin/users")}>
        ユーザーへのバッジ管理 →
      </Button>
    </div>
  );
}
