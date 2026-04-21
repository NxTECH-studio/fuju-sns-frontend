import { useCallback } from "react";
import { updateUser } from "../api/endpoints/users";
import { toMeVM } from "../services/mappers";
import type { MeVM } from "../services/vm";
import type { UpdateUserProfileRequest } from "../api/types";
import { useFujuClient } from "./useFujuClient";
import { useMeContext } from "../state/meContext";

export function useProfileEdit() {
  const client = useFujuClient();
  const { state, refresh } = useMeContext();

  const submit = useCallback(
    async (patch: UpdateUserProfileRequest): Promise<MeVM> => {
      if (state.status !== "ready") {
        throw new Error("not authenticated");
      }
      const res = await updateUser(client, state.me.sub, patch);
      const next = toMeVM(res.data);
      await refresh();
      return next;
    },
    [client, state, refresh]
  );

  return { submit };
}
