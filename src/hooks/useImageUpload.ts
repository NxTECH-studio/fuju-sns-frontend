import { useCallback, useEffect, useRef, useState } from "react";
import { uploadImage } from "../api/endpoints/images";
import { useFujuClient } from "./useFujuClient";

// SNS backend の制限と同じ値を UX 用にクライアント側でも事前検証する。
// (backend/internal/handler/image.go の MaxBytesReader = 5 << 20)
const MAX_BYTES = 5 * 1024 * 1024;
// SVG は <script> 等を埋め込めるため、表示時に `<img src>` で扱われると
// Stored XSS の温床となる。バックエンドでも検証されるが、フロント側でも
// 明示的にホワイトリストで弾く。一般的な写真 / バナー用途の MIME のみ許可。
const ALLOWED_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export interface UploadedImage {
  id: string;
  publicUrl: string;
}

export interface ImageUploadState {
  uploading: boolean;
  upload: (file: File) => Promise<UploadedImage>;
}

// `/v1/images` に画像 1 枚を上げて、id と public_url を VM 形式で返す簡易フック。
// 失敗時は throw する (呼び出し側で Toast 表示する想定)。バナー画像のアップロード
// 用途を主眼に作っているが、将来別箇所で再利用しても問題ない設計にしてある。
export function useImageUpload(): ImageUploadState {
  const client = useFujuClient();
  const [uploading, setUploading] = useState(false);
  // unmount 後に setState しないためのガード。
  const mountedRef = useRef(true);
  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    []
  );

  const upload = useCallback(
    async (file: File): Promise<UploadedImage> => {
      // クライアント側プレチェック (backend でも検証されるが UX のため早めに弾く)。
      if (!ALLOWED_MIMES.has(file.type)) {
        throw new Error("JPEG / PNG / WebP / GIF のみ対応しています");
      }
      if (file.size > MAX_BYTES) {
        throw new Error("画像サイズは 5MiB 以下にしてください");
      }

      if (mountedRef.current) setUploading(true);
      try {
        const res = await uploadImage(client, file);
        return { id: res.data.id, publicUrl: res.data.public_url };
      } finally {
        if (mountedRef.current) setUploading(false);
      }
    },
    [client]
  );

  return { uploading, upload };
}
