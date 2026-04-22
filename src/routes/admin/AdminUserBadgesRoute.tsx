import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router";
import { useMe } from "../../hooks/useMe";
import { useAdminBadges } from "../../hooks/useAdminBadges";
import { useUserProfile } from "../../hooks/useUserProfile";
import { useUsers } from "../../hooks/useUsers";
import { useToast } from "../../state/toastContext";
import { Button } from "../../ui/primitives/Button";
import { TextInput } from "../../ui/primitives/TextInput";
import { BadgeChip } from "../../ui/components/BadgeChip";
import { ErrorMessage } from "../../ui/components/ErrorMessage";
import { Avatar } from "../../ui/primitives/Avatar";
import styles from "./AdminUserBadges.module.css";

const USERS_PAGE_SIZE = 20;

export function AdminUserBadgesRoute() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialBadgeKey = searchParams.get("grant") ?? "";
  const me = useMe();
  const [subInput, setSubInput] = useState("");
  const [targetSub, setTargetSub] = useState<string | null>(null);
  const profile = useUserProfile(targetSub);
  const admin = useAdminBadges();
  const toast = useToast();
  const [badgeKey, setBadgeKey] = useState(initialBadgeKey);
  const [reason, setReason] = useState("");
  const [filter, setFilter] = useState("");
  const [offset, setOffset] = useState(0);
  const users = useUsers({ limit: USERS_PAGE_SIZE, offset });

  // Keep badgeKey synced when the query changes (e.g. via back/forward).
  useEffect(() => {
    if (initialBadgeKey) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBadgeKey(initialBadgeKey);
    }
  }, [initialBadgeKey]);

  const filteredUsers = useMemo(() => {
    if (!filter.trim()) return users.users;
    const needle = filter.trim().toLowerCase();
    return users.users.filter(
      (u) =>
        u.displayName.toLowerCase().includes(needle) ||
        u.displayId.toLowerCase().includes(needle) ||
        u.sub.toLowerCase().includes(needle)
    );
  }, [users.users, filter]);

  if (me.status === "loading" || me.status === "idle") {
    return <p>読み込み中...</p>;
  }
  if (me.status !== "ready" || !me.me.isAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleLookup = (e: FormEvent) => {
    e.preventDefault();
    if (subInput.trim()) setTargetSub(subInput.trim());
  };

  const handleGrant = async (e: FormEvent) => {
    e.preventDefault();
    const target = targetSub;
    if (!target) return;
    try {
      await admin.grant(target, {
        badgeKey,
        reason: reason || undefined,
      });
      // If the admin switched to a different user mid-request, skip the
      // toast+refresh so a stale success doesn't land on the new profile.
      if (target !== targetSub) return;
      toast.show("バッジを付与しました", "success");
      setBadgeKey("");
      setReason("");
      profile.refresh();
    } catch (err) {
      if (target !== targetSub) return;
      toast.show(
        err instanceof Error ? err.message : "付与に失敗しました",
        "error"
      );
    }
  };

  const handleRevoke = async (badgeId: string) => {
    const target = targetSub;
    if (!target) return;
    if (!window.confirm("このバッジを剥奪しますか？")) return;
    try {
      await admin.revoke(target, badgeId);
      if (target !== targetSub) return;
      toast.show("バッジを剥奪しました", "success");
      profile.refresh();
    } catch (err) {
      if (target !== targetSub) return;
      toast.show(
        err instanceof Error ? err.message : "剥奪に失敗しました",
        "error"
      );
    }
  };

  const filterActive = filter.trim().length > 0;
  const hasPrev = offset > 0;
  const hasNext = offset + users.users.length < users.total;

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <Button variant="ghost" onClick={() => navigate("/admin/badges")}>
          ← バッジマスター
        </Button>
        <h1>ユーザーへのバッジ管理</h1>
      </div>

      <section className={styles.picker}>
        <div className={styles.pickerControls}>
          <TextInput
            label="フィルタ (displayName / @id / sub の部分一致)"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="検索..."
          />
          <Button
            type="button"
            disabled={!hasPrev || users.loading || filterActive}
            onClick={() => setOffset((o) => Math.max(0, o - USERS_PAGE_SIZE))}
          >
            前へ
          </Button>
          <Button
            type="button"
            disabled={!hasNext || users.loading || filterActive}
            onClick={() => setOffset((o) => o + USERS_PAGE_SIZE)}
          >
            次へ
          </Button>
        </div>
        {filterActive ? (
          <p className={styles.pickerEmpty}>
            フィルタは現在のページ内のみに適用されます。別ページを見るにはフィルタをクリアしてください。
          </p>
        ) : null}
        {users.error ? (
          <ErrorMessage message={users.error} />
        ) : filteredUsers.length === 0 ? (
          <p className={styles.pickerEmpty}>
            {users.loading ? "読み込み中..." : "該当ユーザーなし"}
          </p>
        ) : (
          <ul className={styles.pickerList}>
            {filteredUsers.map((u) => (
              <li key={u.sub}>
                <button
                  type="button"
                  className={styles.pickerItem}
                  onClick={() => setTargetSub(u.sub)}
                >
                  <Avatar src={u.iconUrl} alt={u.displayName} size={28} />
                  <span className={styles.pickerItemMeta}>
                    <span className={styles.pickerItemName}>
                      {u.displayName}
                    </span>
                    <span className={styles.pickerItemSub}>{u.sub}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className={styles.pickerPager}>
          <span>
            {users.total > 0
              ? `${offset + 1}-${offset + users.users.length} / ${users.total}`
              : ""}
          </span>
        </div>
      </section>

      <form onSubmit={handleLookup} className={styles.lookupForm}>
        <TextInput
          label="sub を直接指定 (ULID)"
          value={subInput}
          onChange={(e) => setSubInput(e.target.value)}
          placeholder="01HZXYABCDEFGHJKMNPQRSTVWX"
          minLength={26}
          maxLength={26}
        />
        <Button type="submit">読み込み</Button>
      </form>

      {targetSub ? (
        profile.loading ? (
          <p>読み込み中...</p>
        ) : profile.error ? (
          <ErrorMessage message={profile.error} />
        ) : profile.user ? (
          <>
            <section className={styles.userCard}>
              <Avatar
                src={profile.user.iconUrl}
                alt={profile.user.displayName}
                size={48}
              />
              <div className={styles.userCardMeta}>
                <span className={styles.displayName}>
                  {profile.user.displayName}
                </span>
                <span className={styles.displayId}>
                  @{profile.user.displayId}
                </span>
              </div>
            </section>

            <section className={styles.section}>
              <h2>現在のバッジ</h2>
              {profile.user.badges.length === 0 ? (
                <p className={styles.pickerEmpty}>なし</p>
              ) : (
                <ul className={styles.badgeList}>
                  {profile.user.badges.map((b) => (
                    <li key={b.id} className={styles.badgeRow}>
                      <BadgeChip badge={b} />
                      <span className={styles.badgeKey}>
                        <code>{b.key}</code>
                      </span>
                      <Button
                        variant="danger"
                        onClick={() => void handleRevoke(b.id)}
                      >
                        剥奪
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className={styles.section}>
              <h2>バッジを付与</h2>
              <form onSubmit={handleGrant} className={styles.grantForm}>
                <TextInput
                  label="badge_key"
                  value={badgeKey}
                  onChange={(e) => setBadgeKey(e.target.value)}
                  required
                  list="admin-badge-keys"
                />
                <datalist id="admin-badge-keys">
                  {admin.badges.map((b) => (
                    <option key={b.id} value={b.key}>
                      {b.label}
                    </option>
                  ))}
                </datalist>
                <TextInput
                  label="reason (任意)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={255}
                />
                <Button type="submit" variant="primary">
                  付与
                </Button>
              </form>
            </section>
          </>
        ) : (
          <p>ユーザーが見つかりません</p>
        )
      ) : null}
    </div>
  );
}
