import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { useMeReady } from "../../hooks/useMeReady";
import { useProfileEdit } from "../../hooks/useProfileEdit";
import { useToast } from "../../state/toastContext";
import { TextArea } from "../../ui/primitives/TextArea";
import { TextInput } from "../../ui/primitives/TextInput";
import { Button } from "../../ui/primitives/Button";
import styles from "../Settings.module.css";

export function SettingsProfileSection() {
  const navigate = useNavigate();
  const me = useMeReady();
  const { submit } = useProfileEdit();
  const toast = useToast();
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
      setBio(me.bio);
      setBannerUrl(me.bannerUrl);
    }
    // Only re-sync when the identity changes — edits shouldn't revert on re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedSub]);

  if (!me) return null;

  const handle = async (e: FormEvent) => {
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
    <form onSubmit={handle} className={styles.form}>
      <h1>プロフィール編集</h1>
      <p className={styles.formNote}>
        display_name / display_id / アイコンは AuthCore 側で編集してください。
      </p>
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
  );
}
