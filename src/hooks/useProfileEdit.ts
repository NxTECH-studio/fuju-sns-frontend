import { useCallback } from "react";
import { updateUser } from "../api/endpoints/users";
import { toMeVM } from "../services/mappers";
import { fromUpdateProfileInput } from "../services/inputMappers";
import type { MeVM } from "../types/vm";
import type { UpdateProfileInput } from "../types/vmInputs";
import { useFujuClient } from "./useFujuClient";
import { useMeContext } from "../state/meContext";

export function useProfileEdit() {
  const client = useFujuClient();
  const { state, refresh } = useMeContext();

  const submit = useCallback(
    async (input: UpdateProfileInput): Promise<MeVM> => {
      if (state.status !== "ready") {
        throw new Error("not authenticated");
      }
      const res = await updateUser(
        client,
        state.me.sub,
        fromUpdateProfileInput(input)
      );
      const next = toMeVM(res.data);
      await refresh();
      return next;
    },
    [client, state, refresh]
  );

  return { submit };
}
