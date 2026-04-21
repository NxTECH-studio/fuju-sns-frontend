import { useCallback } from "react";
import { createPost, deletePost } from "../api/endpoints/posts";
import { toPostVM } from "../services/mappers";
import type { PostVM } from "../services/vm";
import type { CreatePostRequest } from "../api/types";
import { useFujuClient } from "./useFujuClient";

export interface PostActions {
  create: (input: CreatePostRequest) => Promise<PostVM>;
  remove: (id: string) => Promise<void>;
}

export function usePostActions(): PostActions {
  const client = useFujuClient();

  const create = useCallback(
    async (input: CreatePostRequest): Promise<PostVM> => {
      const res = await createPost(client, input);
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
