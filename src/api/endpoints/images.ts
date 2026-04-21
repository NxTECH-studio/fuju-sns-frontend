import type { FujuClient } from "../client";
import type { ImageEnvelope, ImageListResponse, ULID } from "../types";

export function imagesListMine(
  client: FujuClient,
  signal?: AbortSignal
): Promise<ImageListResponse> {
  return client.get<ImageListResponse>("/v1/images", { signal });
}

export function imagesUpload(
  client: FujuClient,
  file: File,
  signal?: AbortSignal
): Promise<ImageEnvelope> {
  const form = new FormData();
  form.append("file", file);
  return client.postForm<ImageEnvelope>("/v1/images", form, { signal });
}

export function imagesDelete(
  client: FujuClient,
  id: ULID,
  signal?: AbortSignal
): Promise<void> {
  return client.del(`/v1/images/${encodeURIComponent(id)}`, { signal });
}
