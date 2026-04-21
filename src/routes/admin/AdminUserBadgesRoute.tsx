import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router";
import { useMe } from "../../hooks/useMe";
import { useAdminBadges } from "../../hooks/useAdminBadges";
import { useUserProfile } from "../../hooks/useUserProfile";
import { useToast } from "../../state/toastContext";
import { Button } from "../../ui/primitives/Button";
import { TextInput } from "../../ui/primitives/TextInput";
import { BadgeChip } from "../../ui/components/BadgeChip";
import { ErrorMessage } from "../../ui/components/ErrorMessage";
import { Avatar } from "../../ui/primitives/Avatar";

export function AdminUserBadgesRoute() {
  const navigate = useNavigate();
  const me = useMe();
  const [subInput, setSubInput] = useState("");
  const [targetSub, setTargetSub] = useState<string | null>(null);
  const profile = useUserProfile(targetSub);
  const admin = useAdminBadges();
  const toast = useToast();
  const [badgeKey, setBadgeKey] = useState("");
  const [reason, setReason] = useState("");

  if (me.status === "loading" || me.status === "idle")
    return <p>読み込み中...</p>;
  if (me.status !== "ready" || !me.me.isAdmin)
    return <Navigate to="/" replace />;

  const handleLookup = (e: FormEvent) => {
    e.preventDefault();
    if (subInput.trim()) setTargetSub(subInput.trim());
  };

  const handleGrant = async (e: FormEvent) => {
    e.preventDefault();
    if (!targetSub) return;
    try {
      await admin.grant(targetSub, {
        badge_key: badgeKey,
        reason: reason || undefined,
      });
      toast.show("バッジを付与しました", "success");
      setBadgeKey("");
      setReason("");
      profile.refresh();
    } catch (err) {
      toast.show(
        err instanceof Error ? err.message : "付与に失敗しました",
        "error"
      );
    }
  };

  const handleRevoke = async (badgeId: string) => {
    if (!targetSub) return;
    if (!window.confirm("このバッジを剥奪しますか？")) return;
    try {
      await admin.revoke(targetSub, badgeId);
      toast.show("バッジを剥奪しました", "success");
      profile.refresh();
    } catch (err) {
      toast.show(
        err instanceof Error ? err.message : "剥奪に失敗しました",
        "error"
      );
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Button variant="ghost" onClick={() => navigate("/admin/badges")}>
          ← バッジマスター
        </Button>
        <h1>ユーザーへのバッジ管理</h1>
      </div>
      <form
        onSubmit={handleLookup}
        style={{ display: "flex", gap: 8, alignItems: "flex-end" }}
      >
        <TextInput
          label="対象ユーザーの sub (ULID)"
          value={subInput}
          onChange={(e) => setSubInput(e.target.value)}
          placeholder="01HZXYABCDEFGHJKMNPQRSTVWX"
          required
          minLength={26}
          maxLength={26}
          style={{ flex: 1 }}
        />
        <Button type="submit" variant="primary">
          読み込み
        </Button>
      </form>

      {targetSub ? (
        profile.loading ? (
          <p>読み込み中...</p>
        ) : profile.error ? (
          <ErrorMessage message={profile.error} />
        ) : profile.user ? (
          <>
            <section
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                padding: 12,
                border: "1px solid var(--border)",
                borderRadius: 8,
              }}
            >
              <Avatar
                src={profile.user.iconUrl}
                alt={profile.user.displayName}
                size={48}
              />
              <div>
                <p style={{ color: "var(--text-h)", fontWeight: 500 }}>
                  {profile.user.displayName}
                </p>
                <p style={{ fontSize: 12, color: "var(--text)" }}>
                  @{profile.user.displayId}
                </p>
              </div>
            </section>

            <section>
              <h2>現在のバッジ</h2>
              {profile.user.badges.length === 0 ? (
                <p style={{ color: "var(--text)" }}>なし</p>
              ) : (
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  {profile.user.badges.map((b) => (
                    <li
                      key={b.id}
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        padding: 8,
                        border: "1px solid var(--border)",
                        borderRadius: 6,
                      }}
                    >
                      <BadgeChip badge={b} />
                      <span
                        style={{ flex: 1, fontSize: 12, color: "var(--text)" }}
                      >
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

            <section>
              <h2>バッジを付与</h2>
              <form
                onSubmit={handleGrant}
                style={{ display: "flex", flexDirection: "column", gap: 8 }}
              >
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
