import { useCallback } from "react";
import {
  imagesDelete,
  imagesListMine,
  imagesUpload,
} from "../api/endpoints/images";
import { isFujuApiError } from "../api/error";
import { toImageVM } from "../services/mappers";
import type { ImageVM } from "../types/vm";
import { useFujuClient } from "./useFujuClient";
import { useAbortableResource } from "./useAbortableResource";

interface ImagesResource {
  images: ImageVM[];
  unavailable: boolean;
}

export interface ImagesState {
  images: ImageVM[];
  loading: boolean;
  error: string | null;
  unavailable: boolean;
  upload: (file: File) => Promise<ImageVM>;
  remove: (id: string) => Promise<void>;
  refresh: () => void;
}

export function useImages(): ImagesState {
  const client = useFujuClient();

  const fetcher = useCallback(
    async (signal: AbortSignal): Promise<ImagesResource> => {
      try {
        const res = await imagesListMine(client, signal);
        return { images: res.data.map(toImageVM), unavailable: false };
      } catch (e) {
        if (isFujuApiError(e) && e.status === 404) {
          return { images: [], unavailable: true };
        }
        throw e;
      }
    },
    [client]
  );

  const resource = useAbortableResource<ImagesResource>({
    fetcher,
    deps: [client],
  });

  const upload = useCallback(
    async (file: File): Promise<ImageVM> => {
      const res = await imagesUpload(client, file);
      const vm = toImageVM(res.data);
      resource.setData((prev) =>
        prev
          ? { ...prev, images: [vm, ...prev.images] }
          : { images: [vm], unavailable: false }
      );
      return vm;
    },
    [client, resource]
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      await imagesDelete(client, id);
      resource.setData((prev) =>
        prev
          ? { ...prev, images: prev.images.filter((i) => i.id !== id) }
          : prev
      );
    },
    [client, resource]
  );

  return {
    images: resource.data?.images ?? [],
    loading: resource.loading,
    error: resource.error,
    unavailable: resource.data?.unavailable ?? false,
    upload,
    remove,
    refresh: resource.reload,
  };
}
