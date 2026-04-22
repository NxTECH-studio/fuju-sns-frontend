import { useCallback } from "react";
import { createPost, deletePost } from "../api/endpoints/posts";
import { toPostVM } from "../services/mappers";
import { fromCreatePostInput } from "../services/inputMappers";
import type { PostVM } from "../types/vm";
import type { CreatePostInput } from "../types/vmInputs";
import { useFujuClient } from "./useFujuClient";

export interface PostActions {
  create: (input: CreatePostInput) => Promise<PostVM>;
  remove: (id: string) => Promise<void>;
}

export function usePostActions(): PostActions {
  const client = useFujuClient();

  const create = useCallback(
    async (input: CreatePostInput): Promise<PostVM> => {
      const res = await createPost(client, fromCreatePostInput(input));
      return toPostVM(res.data);
    },
    [client]
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      await deletePost(client, id);
    },
    [client]
  );

  return { create, remove };
}
