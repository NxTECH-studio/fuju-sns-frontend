import { useCallback, useEffect, useRef, useState } from "react";
import {
  imagesDelete,
  imagesListMine,
  imagesUpload,
} from "../api/endpoints/images";
import { isAbortError, isFujuApiError } from "../api/error";
import { toImageVM } from "../services/mappers";
import type { ImageVM } from "../services/vm";
import { useFujuClient } from "./useFujuClient";

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
  const [images, setImages] = useState<ImageVM[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [tick, setTick] = useState(0);
  const ctrlRef = useRef<AbortController | null>(null);

  useEffect(() => {
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    setUnavailable(false);

    imagesListMine(client, ctrl.signal)
      .then((res) => {
        if (ctrl.signal.aborted) return;
        setImages(res.data.map(toImageVM));
        setLoading(false);
      })
      .catch((e) => {
        if (isAbortError(e) || ctrl.signal.aborted) return;
        if (isFujuApiError(e) && e.status === 404) {
          setUnavailable(true);
          setLoading(false);
          return;
        }
        setError(e instanceof Error ? e.message : "unknown error");
        setLoading(false);
      });

    return () => {
      ctrl.abort();
    };
  }, [client, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const upload = useCallback(
    async (file: File): Promise<ImageVM> => {
      const res = await imagesUpload(client, file);
      const vm = toImageVM(res.data);
      setImages((prev) => [vm, ...prev]);
      return vm;
    },
    [client]
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      await imagesDelete(client, id);
      setImages((prev) => prev.filter((i) => i.id !== id));
    },
    [client]
  );

  return { images, loading, error, unavailable, upload, remove, refresh };
}
