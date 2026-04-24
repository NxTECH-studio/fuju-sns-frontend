import { useCallback } from "react";
import {
  adminBadgesCreate,
  adminBadgesGrant,
  adminBadgesList,
  adminBadgesRevoke,
  adminBadgesUpdate,
} from "../api/endpoints/admin";
import { toBadgeVM } from "../services/mappers";
import {
  fromCreateBadgeInput,
  fromGrantBadgeInput,
  fromUpdateBadgeInput,
} from "../services/inputMappers";
import type { BadgeVM } from "../types/vm";
import type {
  CreateBadgeInput,
  GrantBadgeInput,
  UpdateBadgeInput,
} from "../types/vmInputs";
import { useFujuClient } from "./useFujuClient";
import { useAbortableResource } from "./useAbortableResource";

export interface AdminBadgesState {
  badges: BadgeVM[];
  loading: boolean;
  error: string | null;
  reload: () => void;
  create: (input: CreateBadgeInput) => Promise<BadgeVM>;
  update: (id: string, input: UpdateBadgeInput) => Promise<BadgeVM>;
  grant: (sub: string, input: GrantBadgeInput) => Promise<BadgeVM>;
  revoke: (sub: string, badgeId: string) => Promise<void>;
}

export function useAdminBadges(): AdminBadgesState {
  const client = useFujuClient();

  const fetcher = useCallback(
    async (signal: AbortSignal): Promise<BadgeVM[]> => {
      const res = await adminBadgesList(client, signal);
      return res.data.map(toBadgeVM);
    },
    [client]
  );

  const resource = useAbortableResource<BadgeVM[]>({
    fetcher,
    deps: [client],
  });

  const create = useCallback(
    async (input: CreateBadgeInput): Promise<BadgeVM> => {
      const res = await adminBadgesCreate(client, fromCreateBadgeInput(input));
      const vm = toBadgeVM(res.data);
      resource.setData((prev) => (prev ? [...prev, vm] : [vm]));
      return vm;
    },
    [client, resource]
  );

  const update = useCallback(
    async (id: string, input: UpdateBadgeInput): Promise<BadgeVM> => {
      const res = await adminBadgesUpdate(
        client,
        id,
        fromUpdateBadgeInput(input)
      );
      const vm = toBadgeVM(res.data);
      resource.setData((prev) =>
        prev ? prev.map((b) => (b.id === id ? vm : b)) : prev
      );
      return vm;
    },
    [client, resource]
  );

  const grant = useCallback(
    async (sub: string, input: GrantBadgeInput): Promise<BadgeVM> => {
      const res = await adminBadgesGrant(
        client,
        sub,
        fromGrantBadgeInput(input)
      );
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

  return {
    badges: resource.data ?? [],
    loading: resource.loading,
    error: resource.error,
    reload: resource.reload,
    create,
    update,
    grant,
    revoke,
  };
}
