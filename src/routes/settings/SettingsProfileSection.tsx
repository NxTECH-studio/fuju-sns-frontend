import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { isAuthError, useAuth, validatePublicId } from "fuju-auth-react";
import { useMeReady } from "../../hooks/useMeReady";
import { useMeContext } from "../../state/meContext";
import { useProfileEdit } from "../../hooks/useProfileEdit";
import { useToast } from "../../state/toastContext";
import { TextArea } from "../../ui/primitives/TextArea";
import { TextInput } from "../../ui/primitives/TextInput";
import { Button } from "../../ui/primitives/Button";
import styles from "../Settings.module.css";
import { messageForPublicIdError } from "./messageForPublicIdError";

export function SettingsProfileSection() {
  const navigate = useNavigate();
  const me = useMeReady();
  const { submit } = useProfileEdit();
  const { updatePublicID, user: authUser } = useAuth();
  const { refresh: refreshMe } = useMeContext();
  const toast = useToast();

  const [publicId, setPublicId] = useState("");
  const [publicIdError, setPublicIdError] = useState<string | undefined>();
  const [publicIdBusy, setPublicIdBusy] = useState(false);

  const [bio, setBio] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const loadedSub = me?.sub ?? null;
  useEffect(() => {
    if (me) {
      // Hydrate the form once per identity from the loaded profile. This is the
      // intended sync direction (external state -> form), and the effect only
      // fires when the user identity changes, not on every keystroke.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPublicId(me.displayId);
      setBio(me.bio);
      setBannerUrl(me.bannerUrl);
    }
    // Only re-sync when the identity changes — edits shouldn't revert on re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedSub]);

  if (!me) return null;

  const handlePublicIdSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPublicIdError(undefined);

    const draft = publicId.trim();
    // AuthCore in-memory の publicId と比較する。me.displayId は Fuju 側 1h TTL
    // キャッシュ由来でラグがあり、レート制限予防用 no-op の起点としては不正確。
    if (draft === authUser.publicId) return;

    const clientErr = validatePublicId(draft);
    if (clientErr) {
      setPublicIdError(
        messageForPublicIdError(clientErr) ?? "入力内容を確認してください"
      );
      return;
    }

    setPublicIdBusy(true);
    try {
      // updatePublicID は内部で loadProfile() を呼ぶため、ここで refreshProfile() を
      // 明示的に呼ぶ必要はない。Fuju 側 (MeVM.displayId) のキャッシュは最大 1h ラグ
      // するので refreshMe() で即時取得を試みる (TTL 内なら未反映だが副作用はない)。
      await updatePublicID(draft);
      await refreshMe();
      toast.show("公開 ID を更新しました", "success");
    } catch (err) {
      if (isAuthError(err)) {
        const mapped = messageForPublicIdError(err.code);
        if (mapped) {
          setPublicIdError(mapped);
          toast.show(mapped, "error");
          return;
        }
      }
      const fallback =
        err instanceof Error && err.message
          ? err.message
          : "更新に失敗しました";
      toast.show(fallback, "error");
    } finally {
      setPublicIdBusy(false);
    }
  };

  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await submit({ bio, bannerUrl });
      toast.show("保存しました", "success");
      navigate(`/users/${me.sub}`);
    } catch (err) {
      toast.show(
        err instanceof Error ? err.message : "保存に失敗しました",
        "error"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.profileSections}>
      <h1>プロフィール編集</h1>
      <p className={styles.formNote}>
        表示名 (display name)
        はログイン元のアカウント設定で編集してください。アイコンも同様です。
      </p>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>公開 ID</h2>
        <p className={styles.formNote}>
          公開 ID を変更すると、表示名にも反映されます。
        </p>
        <form onSubmit={handlePublicIdSubmit} className={styles.form}>
          <TextInput
            label="公開 ID (display_id)"
            value={publicId}
            onChange={(e) => {
              setPublicId(e.target.value);
              if (publicIdError) setPublicIdError(undefined);
            }}
            // 制約は fuju-auth-react の validatePublicId (^[a-zA-Z0-9]{4,16}$) と同期。
            minLength={4}
            maxLength={16}
            pattern="[A-Za-z0-9]+"
            inputMode="text"
            autoComplete="off"
            error={publicIdError}
          />
          <div className={styles.formActions}>
            <Button
              type="button"
              variant="ghost"
              disabled={publicIdBusy}
              onClick={() => {
                setPublicId(authUser.publicId);
                setPublicIdError(undefined);
              }}
            >
              キャンセル
            </Button>
            <Button type="submit" variant="primary" disabled={publicIdBusy}>
              {publicIdBusy ? "更新中..." : "公開 ID を更新"}
            </Button>
          </div>
        </form>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>プロフィール詳細</h2>
        <form onSubmit={handleProfileSubmit} className={styles.form}>
          <TextArea
            label="自己紹介 (bio, 最大 500 文字)"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={500}
            rows={4}
          />
          <TextInput
            label="バナー画像 URL"
            value={bannerUrl}
            onChange={(e) => setBannerUrl(e.target.value)}
            maxLength={1024}
            placeholder="https://..."
          />
          <div className={styles.formActions}>
            <Button type="button" variant="ghost" onClick={() => navigate(-1)}>
              キャンセル
            </Button>
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? "保存中..." : "保存"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
