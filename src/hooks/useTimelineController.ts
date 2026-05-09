import { useCallback } from "react";
import { useTimeline, type TimelineKind } from "./useTimeline";
import { usePostActions } from "./usePostActions";
import { useToast } from "../state/toastContext";
import type { PagedListState } from "./usePagedList";
import type { PostVM } from "../types/vm";

export interface TimelineController {
  timeline: PagedListState<PostVM>;
  onDelete: (id: string) => Promise<void>;
  onLikeChange: (
    postId: string,
    next: { liked: boolean; count: number }
  ) => void;
  onCreate: (input: {
    content: string;
    parentPostId?: string | null;
  }) => Promise<void>;
}

// Bundles the timeline hook with the delete / like / create handlers that
// every timeline-rendering route was repeating. Callers hand the returned
// functions straight to <PostRow /> and <PostComposer />.
export function useTimelineController(
  kind: TimelineKind,
  userSub?: string
): TimelineController {
  const timeline = useTimeline(kind, userSub);
  const actions = usePostActions();
  const toast = useToast();
  // usePagedList returns a fresh object on every render but the action
  // methods (prepend / removeById / updateById) inside it are each
  // useCallback-stable. Destructure them so our own useCallback deps
  // don't pick up the outer unstable reference.
  const { prepend, removeById, updateById } = timeline;

  const onDelete = useCallback(
    async (id: string): Promise<void> => {
      if (!window.confirm("この投稿を削除しますか？")) return;
      try {
        await actions.remove(id);
        removeById((p) => p.id === id);
        toast.show("投稿を削除しました", "success");
      } catch (e) {
        toast.show(
          e instanceof Error ? e.message : "削除に失敗しました",
          "error"
        );
      }
    },
    [actions, removeById, toast]
  );

  const onLikeChange = useCallback(
    (postId: string, next: { liked: boolean; count: number }) => {
      updateById(
        (x) => x.id === postId,
        (x) => ({ ...x, likedByViewer: next.liked, likesCount: next.count })
      );
    },
    [updateById]
  );

  const onCreate = useCallback(
    async (input: {
      content: string;
      parentPostId?: string | null;
    }): Promise<void> => {
      const vm = await actions.create(input);
      prepend(vm);
      toast.show("投稿しました", "success");
    },
    [actions, prepend, toast]
  );

  return { timeline, onDelete, onLikeChange, onCreate };
}
