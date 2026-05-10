import { useCallback, useState } from "react";
import { uploadImage } from "../api/endpoints/images";
import { useFujuClient } from "./useFujuClient";

// SNS backend の制限と同じ値を UX 用にクライアント側でも事前検証する。
// (backend/internal/handler/image.go の MaxBytesReader = 5 << 20, MIME = "image/")
const MAX_BYTES = 5 * 1024 * 1024;
const MIME_PREFIX = "image/";

export interface UploadedImage {
  id: string;
  publicUrl: string;
}

export interface ImageUploadState {
  uploading: boolean;
  error: string | null;
  upload: (file: File) => Promise<UploadedImage>;
}

// `/v1/images` に画像 1 枚を上げて、id と public_url を VM 形式で返す簡易フック。
// 失敗時は throw する (呼び出し側で Toast 表示する想定)。バナー画像のアップロード
// 用途を主眼に作っているが、将来別箇所で再利用しても問題ない設計にしてある。
export function useImageUpload(): ImageUploadState {
  const client = useFujuClient();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File): Promise<UploadedImage> => {
      // クライアント側プレチェック (backend でも検証されるが UX のため早めに弾く)。
      if (!file.type.startsWith(MIME_PREFIX)) {
        const msg = "画像ファイルを選択してください";
        setError(msg);
        throw new Error(msg);
      }
      if (file.size > MAX_BYTES) {
        const msg = "画像サイズは 5MiB 以下にしてください";
        setError(msg);
        throw new Error(msg);
      }

      setUploading(true);
      setError(null);
      try {
        const res = await uploadImage(client, file);
        return { id: res.data.id, publicUrl: res.data.public_url };
      } catch (e) {
        const msg =
          e instanceof Error ? e.message : "アップロードに失敗しました";
        setError(msg);
        throw e;
      } finally {
        setUploading(false);
      }
    },
    [client]
  );

  return { uploading, error, upload };
}
