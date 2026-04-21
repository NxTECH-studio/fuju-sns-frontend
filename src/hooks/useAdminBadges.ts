import { useCallback, useEffect, useRef, useState } from "react";
import {
  adminBadgesCreate,
  adminBadgesGrant,
  adminBadgesList,
  adminBadgesRevoke,
  adminBadgesUpdate,
} from "../api/endpoints/admin";
import { isAbortError } from "../api/error";
import { toBadgeVM } from "../services/mappers";
import type { BadgeVM } from "../services/vm";
import type {
  CreateBadgeRequest,
  GrantBadgeRequest,
  UpdateBadgeRequest,
} from "../api/types";
import { useFujuClient } from "./useFujuClient";

export interface AdminBadgesState {
  badges: BadgeVM[];
  loading: boolean;
  error: string | null;
  reload: () => void;
  create: (input: CreateBadgeRequest) => Promise<BadgeVM>;
  update: (id: string, input: UpdateBadgeRequest) => Promise<BadgeVM>;
  grant: (sub: string, input: GrantBadgeRequest) => Promise<BadgeVM>;
  revoke: (sub: string, badgeId: string) => Promise<void>;
}

export function useAdminBadges(): AdminBadgesState {
  const client = useFujuClient();
  const [badges, setBadges] = useState<BadgeVM[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const ctrlRef = useRef<AbortController | null>(null);

  useEffect(() => {
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);

    adminBadgesList(client, ctrl.signal)
      .then((res) => {
        if (ctrl.signal.aborted) return;
        setBadges(res.data.map(toBadgeVM));
        setLoading(false);
      })
      .catch((e) => {
        if (isAbortError(e) || ctrl.signal.aborted) return;
        setError(e instanceof Error ? e.message : "unknown error");
        setLoading(false);
      });

    return () => {
      ctrl.abort();
    };
  }, [client, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  const create = useCallback(
    async (input: CreateBadgeRequest): Promise<BadgeVM> => {
      const res = await adminBadgesCreate(client, input);
      const vm = toBadgeVM(res.data);
      setBadges((prev) => [...prev, vm]);
      return vm;
    },
    [client]
  );

  const update = useCallback(
    async (id: string, input: UpdateBadgeRequest): Promise<BadgeVM> => {
      const res = await adminBadgesUpdate(client, id, input);
      const vm = toBadgeVM(res.data);
      setBadges((prev) => prev.map((b) => (b.id === id ? vm : b)));
      return vm;
    },
    [client]
  );

  const grant = useCallback(
    async (sub: string, input: GrantBadgeRequest): Promise<BadgeVM> => {
      const res = await adminBadgesGrant(client, sub, input);
      return toBadgeVM(res.data.badge);
    },
    [client]
  );

  const revoke = useCallback(
    async (sub: string, badgeId: string): Promise<void> => {
      await adminBadgesRevoke(client, sub, badgeId);
    },
    [client]
  );

  return { badges, loading, error, reload, create, update, grant, revoke };
}
