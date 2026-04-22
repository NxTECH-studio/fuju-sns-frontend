import { useNavigate } from "react-router";
import { useAuthStatus } from "../auth-component/src";
import { useImages } from "../hooks/useImages";
import { useToast } from "../state/toastContext";
import { ImageUploader } from "../ui/components/ImageUploader";
import { ImageGallery } from "../ui/components/ImageGallery";
import { EmptyState } from "../ui/components/EmptyState";
import { ErrorMessage } from "../ui/components/ErrorMessage";
import { Button } from "../ui/primitives/Button";

export function ImagesRoute() {
  const navigate = useNavigate();
  const { status } = useAuthStatus();
  const state = useImages();
  const toast = useToast();

  if (status !== "authenticated") {
    return (
      <EmptyState
        title="ログインが必要です"
        action={
          <Button variant="primary" onClick={() => navigate("/login")}>
            ログイン
          </Button>
        }
      />
    );
  }

  if (state.unavailable) {
    return (
      <EmptyState
        title="画像機能は現在無効です"
        description="バックエンドで R2 ストレージが設定されていません。"
      />
    );
  }

  const handleUpload = async (file: File) => {
    try {
      await state.upload(file);
      toast.show("アップロードしました", "success");
    } catch (e) {
      toast.show(
        e instanceof Error ? e.message : "アップロードに失敗しました",
        "error"
      );
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("この画像を削除しますか？")) return;
    try {
      await state.remove(id);
      toast.show("削除しました", "success");
    } catch (e) {
      toast.show(
        e instanceof Error ? e.message : "削除に失敗しました",
        "error"
      );
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h1>画像</h1>
      <ImageUploader onSelect={(f) => void handleUpload(f)} />
      {state.loading ? (
        <p>読み込み中...</p>
      ) : state.error ? (
        <ErrorMessage message={state.error} />
      ) : (
        <ImageGallery
          images={state.images}
          onDelete={(id) => void handleDelete(id)}
        />
      )}
    </div>
  );
}
