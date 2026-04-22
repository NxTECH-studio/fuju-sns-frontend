import { useCallback } from "react";
import { createPost, deletePost } from "../api/endpoints/posts";
import { meToAuthorVM, toPostVM } from "../services/mappers";
import type { PostVM } from "../services/vm";
import type { CreatePostRequest } from "../api/types";
import { useFujuClient } from "./useFujuClient";
import { useMe, type UseMeReturn } from "./useMe";

export interface PostActions {
  create: (input: CreatePostRequest) => Promise<PostVM>;
  remove: (id: string) => Promise<void>;
}

// Compensate for a backend quirk where `POST /posts` occasionally returns the
// newly created post with `author: null` (the hydration join hasn't settled
// yet). When the post is the caller's own and `me` is ready, we fill `author`
// from the `MeProvider` cache so the card doesn't flash `(deleted)` before
// the next reload. No-op otherwise.
function fillAuthorFromMe(vm: PostVM, me: UseMeReturn): PostVM {
  if (vm.author !== null) return vm;
  if (me.status !== "ready") return vm;
  if (vm.userId !== me.me.sub) return vm;
  return { ...vm, author: meToAuthorVM(me.me) };
}

export function usePostActions(): PostActions {
  const client = useFujuClient();
  const me = useMe();

  const create = useCallback(
    async (input: CreatePostRequest): Promise<PostVM> => {
      const res = await createPost(client, input);
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
