import { useCallback } from "react";
import { usePostDetail, type PostDetailState } from "./usePostDetail";
import { usePostActions } from "./usePostActions";
import { useToast } from "../state/toastContext";

export interface PostDetailController {
  detail: PostDetailState;
  onDelete: (
    postId: string,
    rootId: string,
    onPrimaryDeleted?: () => void
  ) => Promise<void>;
  onReply: (input: {
    content: string;
    parentPostId?: string | null;
  }) => Promise<void>;
}

// Same idea as useTimelineController but for the post-detail view where
// the page is composed of a primary post + its replies.
export function usePostDetailController(id: string): PostDetailController {
  const detail = usePostDetail(id);
  const actions = usePostActions();
  const toast = useToast();
  // Pull stable method refs out of the detail object so our useCallback
  // deps don't pick up the fresh `detail` object each render.
  const { appendReply, removeReply } = detail;

  const onDelete = useCallback(
    async (
      postId: string,
      rootId: string,
      onPrimaryDeleted?: () => void
    ): Promise<void> => {
      if (!window.confirm("この投稿を削除しますか？")) return;
      try {
        await actions.remove(postId);
        if (postId === rootId) {
          toast.show("投稿を削除しました", "success");
          onPrimaryDeleted?.();
        } else {
          removeReply(postId);
          toast.show("返信を削除しました", "success");
        }
      } catch (e) {
        toast.show(
          e instanceof Error ? e.message : "削除に失敗しました",
          "error"
        );
      }
    },
    [actions, removeReply, toast]
  );

  const onReply = useCallback(
    async (input: {
      content: string;
      parentPostId?: string | null;
    }): Promise<void> => {
      const vm = await actions.create({ ...input, parentPostId: id });
      appendReply(vm);
      toast.show("返信しました", "success");
    },
    [actions, appendReply, id, toast]
  );

  return { detail, onDelete, onReply };
}
