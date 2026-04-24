import { useCallback } from "react";
import { createPost, deletePost } from "../api/endpoints/posts";
import { meToAuthorVM, toPostVM } from "../services/mappers";
import { fromCreatePostInput } from "../services/inputMappers";
import type { PostVM } from "../types/vm";
import type { CreatePostInput } from "../types/vmInputs";
import { useFujuClient } from "./useFujuClient";
import { useMeContext, type MeState } from "../state/meContext";

export interface PostActions {
  create: (input: CreatePostInput) => Promise<PostVM>;
  remove: (id: string) => Promise<void>;
}

// Compensate for a backend quirk where `POST /posts` occasionally returns the
// newly created post with `author: null` (the hydration join hasn't settled
// yet). When the post is the caller's own and `me` is ready, we fill `author`
// from the `MeProvider` cache so the card doesn't flash `(deleted)` before
// the next reload. No-op otherwise.
function fillAuthorFromMe(vm: PostVM, me: MeState): PostVM {
  if (vm.author !== null) return vm;
  if (me.status !== "ready") return vm;
  if (vm.userId !== me.me.sub) return vm;
  return { ...vm, author: meToAuthorVM(me.me) };
}

export function usePostActions(): PostActions {
  const client = useFujuClient();
  // Read `state` from the context directly: `useMe()` spreads state into a new
  // object every render, which would churn the `useCallback` dependency below.
  const { state: me } = useMeContext();

  const create = useCallback(
    async (input: CreatePostInput): Promise<PostVM> => {
      const res = await createPost(client, fromCreatePostInput(input));
      return fillAuthorFromMe(toPostVM(res.data), me);
    },
    [client, me]
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      await deletePost(client, id);
    },
    [client]
  );

  return { create, remove };
}
