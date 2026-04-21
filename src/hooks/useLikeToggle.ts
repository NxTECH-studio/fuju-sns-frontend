import { useCallback, useState } from 'react';
import { likePost, unlikePost } from '../api/endpoints/posts';
import { useFujuClient } from './useFujuClient';

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
  onChange?: (next: { liked: boolean; count: number }) => void,
): LikeToggleState {
  const client = useFujuClient();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, setPending] = useState(false);

  const toggle = useCallback(async () => {
    if (pending) return;
    const nextLiked = !liked;
    const nextCount = Math.max(0, count + (nextLiked ? 1 : -1));
    setLiked(nextLiked);
    setCount(nextCount);
    setPending(true);
    onChange?.({ liked: nextLiked, count: nextCount });
    try {
      if (nextLiked) await likePost(client, postId);
      else await unlikePost(client, postId);
    } catch (e) {
      // rollback
      setLiked(liked);
      setCount(count);
      onChange?.({ liked, count });
      throw e;
    } finally {
      setPending(false);
    }
  }, [client, postId, liked, count, pending, onChange]);

  return { liked, count, pending, toggle };
}
