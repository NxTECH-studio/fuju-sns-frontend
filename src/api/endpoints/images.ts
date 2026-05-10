import type { FujuClient } from "../client";
import type { ImageEnvelope } from "../types";

// SNS backend の POST /v1/images に multipart で投げる。フィールド名は
// `file` (MIME `image/*`, 5MiB 上限)。AuthCore のアイコン更新 (`image`
// フィールド, JPEG/PNG/WebP のみ) とは別物なので取り違えに注意。
// 参照: backend/internal/handler/image.go の UploadImage。
export function uploadImage(
  client: FujuClient,
  file: File,
  signal?: AbortSignal
): Promise<ImageEnvelope> {
  const form = new FormData();
  form.append("file", file);
  return client.postForm<ImageEnvelope>("/v1/images", form, { signal });
}
