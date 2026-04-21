import { useCallback, useEffect, useRef, useState } from "react";
import { getPost, listReplies } from "../api/endpoints/posts";
import { isAbortError } from "../api/error";
import { toPostVM } from "../services/mappers";
import type { PostVM } from "../services/vm";
import { useFujuClient } from "./useFujuClient";

export interface PostDetailState {
  post: PostVM | null;
  replies: PostVM[];
  repliesNextCursor: string | null;
  loading: boolean;
  loadingReplies: boolean;
  error: string | null;
  refresh: () => void;
  loadMoreReplies: () => void;
  appendReply: (reply: PostVM) => void;
  removeReply: (id: string) => void;
  updatePost: (next: (p: PostVM) => PostVM) => void;
}

export function usePostDetail(id: string): PostDetailState {
  const client = useFujuClient();
  const [post, setPost] = useState<PostVM | null>(null);
  const [replies, setReplies] = useState<PostVM[]>([]);
  const [repliesNextCursor, setRepliesNextCursor] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const initialCtrlRef = useRef<AbortController | null>(null);
  const moreCtrlRef = useRef<AbortController | null>(null);

  useEffect(() => {
    initialCtrlRef.current?.abort();
    moreCtrlRef.current?.abort();
    if (!id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPost(null);
      setLoading(false);
      setError(null);
      return;
    }
    const ctrl = new AbortController();
    initialCtrlRef.current = ctrl;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const [postRes, repliesRes] = await Promise.all([
          getPost(client, id, ctrl.signal),
          listReplies(client, id, { limit: 20 }, ctrl.signal),
        ]);
        if (ctrl.signal.aborted) return;
        setPost(toPostVM(postRes.data));
        setReplies(repliesRes.data.map(toPostVM));
        setRepliesNextCursor(repliesRes.next_cursor);
        setLoading(false);
      } catch (e) {
        if (isAbortError(e) || ctrl.signal.aborted) return;
        setError(e instanceof Error ? e.message : "unknown error");
        setLoading(false);
      }
    })();

    return () => {
      ctrl.abort();
      moreCtrlRef.current?.abort();
    };
  }, [client, id, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const loadMoreReplies = useCallback(() => {
    if (loadingReplies || !repliesNextCursor || !id) return;
    moreCtrlRef.current?.abort();
    const ctrl = new AbortController();
    moreCtrlRef.current = ctrl;
    setLoadingReplies(true);
    listReplies(
      client,
      id,
      { cursor: repliesNextCursor, limit: 20 },
      ctrl.signal
    )
      .then((res) => {
        if (ctrl.signal.aborted) return;
        setReplies((prev) => [...prev, ...res.data.map(toPostVM)]);
        setRepliesNextCursor(res.next_cursor);
        setLoadingReplies(false);
      })
      .catch((e) => {
        if (isAbortError(e) || ctrl.signal.aborted) return;
        setError(e instanceof Error ? e.message : "unknown error");
        setLoadingReplies(false);
      });
  }, [client, id, loadingReplies, repliesNextCursor]);

  const appendReply = useCallback((reply: PostVM) => {
    setReplies((prev) => [reply, ...prev]);
    setPost((p) => (p ? { ...p, repliesCount: p.repliesCount + 1 } : p));
  }, []);

  const removeReply = useCallback((replyId: string) => {
    setReplies((prev) => prev.filter((r) => r.id !== replyId));
    setPost((p) =>
      p ? { ...p, repliesCount: Math.max(0, p.repliesCount - 1) } : p
    );
  }, []);

  const updatePost = useCallback((next: (p: PostVM) => PostVM) => {
    setPost((p) => (p ? next(p) : p));
  }, []);

  return {
    post,
    replies,
    repliesNextCursor,
    loading,
    loadingReplies,
    error,
    refresh,
    loadMoreReplies,
    appendReply,
    removeReply,
    updatePost,
  };
}
