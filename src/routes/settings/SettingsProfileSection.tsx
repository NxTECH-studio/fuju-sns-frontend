import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useNavigate } from "react-router";
import { isAuthError, useAuth, validatePublicId } from "fuju-auth-react";
import { useMeReady } from "../../hooks/useMeReady";
import { useMeContext } from "../../state/meContext";
import { useProfileEdit } from "../../hooks/useProfileEdit";
import { useImageUpload } from "../../hooks/useImageUpload";
import { useToast } from "../../state/toastContext";
import { Avatar } from "../../ui/primitives/Avatar";
import { TextArea } from "../../ui/primitives/TextArea";
import { TextInput } from "../../ui/primitives/TextInput";
import { Button } from "../../ui/primitives/Button";
import { isSafeHttpUrl } from "../../utils/url";
import styles from "../Settings.module.css";
import { messageForPublicIdError } from "./messageForPublicIdError";

// AuthCore PUT /v1/user/icon の制約 (auth/usecase/user_uc/service.go の
// MaxIconSize = 5 << 20 = 5MiB)。SNS backend の /v1/images とは別物
// (field 名・MIME 制約が異なる)。
const ICON_MAX_BYTES = 5 * 1024 * 1024;
const ICON_ALLOWED_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function SettingsProfileSection() {
  const navigate = useNavigate();
  const me = useMeReady();
  const { submit } = useProfileEdit();
  const { updateIcon, updatePublicID, user: authUser } = useAuth();
  const { refresh: refreshMe } = useMeContext();
  const toast = useToast();
  const imageUpload = useImageUpload();

  const [publicId, setPublicId] = useState("");
  const [publicIdError, setPublicIdError] = useState<string | undefined>();
  const [publicIdBusy, setPublicIdBusy] = useState(false);

  const [bio, setBio] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const [iconBusy, setIconBusy] = useState(false);
  const [bannerBusy, setBannerBusy] = useState(false);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

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
    // banner_url は表示時 (UserProfileView の safeCssUrl) でも http/https 以外を
    // 弾いているが、保存される値自体に javascript: / data: 等が混じるのを防ぐ
    // ため、submit 時にも http/https を要求する。空文字 (バナー解除) は許可。
    const trimmedBannerUrl = bannerUrl.trim();
    if (trimmedBannerUrl !== "" && !isSafeHttpUrl(trimmedBannerUrl)) {
      toast.show(
        "バナー画像 URL は http(s) で始まる URL を指定してください",
        "error"
      );
      return;
    }
    setBusy(true);
    try {
      await submit({ bio, bannerUrl: trimmedBannerUrl });
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

  // AuthCore のアイコン更新。SNS backend の /v1/images は使わない。
  // 内部で PUT /v1/user/icon (multipart, field=image, JPEG/PNG/WebP, 5MB)
  // が呼ばれ、AuthCore 自身はキャッシュを返さないが SNS backend 側の
  // IconURLCached (1h TTL) があるため /me 経由の icon URL は即時反映
  // されないことがある。仕様上の挙動なので注釈表示のみで強制 refresh は行わない。
  const handleIconChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // input をリセットしておくことで同じファイルを連続で選び直せる。
    e.target.value = "";
    if (!file) return;
    if (!ICON_ALLOWED_MIMES.has(file.type)) {
      toast.show("アイコンは JPEG / PNG / WebP のみ対応しています", "error");
      return;
    }
    if (file.size > ICON_MAX_BYTES) {
      toast.show("アイコン画像は 5MiB 以下にしてください", "error");
      return;
    }
    setIconBusy(true);
    try {
      await updateIcon(file);
      // SNS backend の MeVM に新しい icon_url を取り込むため /me を refresh。
      await refreshMe();
      toast.show(
        "アイコンを更新しました (反映まで最大 1 時間ほどかかる場合があります)",
        "success"
      );
    } catch (err) {
      toast.show(
        err instanceof Error ? err.message : "アイコンの更新に失敗しました",
        "error"
      );
    } finally {
      setIconBusy(false);
    }
  };

  // バナーは SNS backend の /v1/images にアップロードして public_url を取得し、
  // テキスト入力欄に流し込む。実際の保存はフォーム送信 (handleProfileSubmit) で
  // PUT /users/{sub} の banner_url に書き込む 2 段構成。アップロード即保存に
  // しないことで誤操作で URL が確定するのを防ぐ。
  const handleBannerChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBannerBusy(true);
    try {
      const uploaded = await imageUpload.upload(file);
      setBannerUrl(uploaded.publicUrl);
      toast.show(
        "バナー画像をアップロードしました。「保存」を押すと反映されます",
        "success"
      );
    } catch (err) {
      toast.show(
        err instanceof Error
          ? err.message
          : "バナーのアップロードに失敗しました",
        "error"
      );
    } finally {
      setBannerBusy(false);
    }
  };

  return (
    <div className={styles.profileSections}>
      <h1>プロフィール編集</h1>
      <p className={styles.formNote}>
        表示名 (display name) はログイン元のアカウント設定で編集してください。
      </p>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>アイコン画像</h2>
        <p className={styles.formNote}>
          JPEG / PNG / WebP, 5MiB 以下。反映まで最大 1
          時間ほどかかる場合があります。
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar src={me.iconUrl} alt={me.displayName} size={64} />
          <input
            ref={iconInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => void handleIconChange(e)}
            style={{ display: "none" }}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={iconBusy}
            onClick={() => iconInputRef.current?.click()}
          >
            {iconBusy ? "アップロード中..." : "アイコンを変更"}
          </Button>
        </div>
      </section>

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
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span className={styles.formNote}>
              バナー画像 (画像ファイルをアップロード、または URL
              を直接入力。5MiB 以下)
            </span>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => void handleBannerChange(e)}
              style={{ display: "none" }}
            />
            <div>
              <Button
                type="button"
                variant="secondary"
                disabled={bannerBusy}
                onClick={() => bannerInputRef.current?.click()}
              >
                {bannerBusy ? "アップロード中..." : "ファイルを選択"}
              </Button>
            </div>
          </div>
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
