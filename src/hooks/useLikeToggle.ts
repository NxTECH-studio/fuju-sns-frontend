import { useCallback, useRef, useState } from "react";
import { likePost, unlikePost } from "../api/endpoints/posts";
import { useFujuClient } from "./useFujuClient";

export interface LikeToggleState {
  liked: boolean;
  count: number;
  pending: boolean;
  toggle: () => Promise<void>;
}

export function useLikeToggle(
  postId: string,
  initialLiked: boolean,
  initialCount: number,
  onChange?: (next: { liked: boolean; count: number }) => void
): LikeToggleState {
  const client = useFujuClient();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);
  // Mirror state in refs so rollback captures the pre-click values
  // regardless of closure staleness.
  const stateRef = useRef({ liked: initialLiked, count: initialCount });
  stateRef.current = { liked, count };

  const toggle = useCallback(async () => {
    if (pending) return;
    const prev = stateRef.current;
    const nextLiked = !prev.liked;
    const nextCount = Math.max(0, prev.count + (nextLiked ? 1 : -1));
    setLiked(nextLiked);
    setCount(nextCount);
    setPending(true);
    onChange?.({ liked: nextLiked, count: nextCount });
    try {
      if (nextLiked) await likePost(client, postId);
      else await unlikePost(client, postId);
    } catch (e) {
      setLiked(prev.liked);
      setCount(prev.count);
      onChange?.({ liked: prev.liked, count: prev.count });
      throw e;
    } finally {
      setPending(false);
    }
  }, [client, postId, pending, onChange]);

  return { liked, count, pending, toggle };
}
