import { useCallback, useState } from 'react';
import { follow, unfollow } from '../api/endpoints/follows';
import { useFujuClient } from './useFujuClient';

export interface FollowToggleState {
  following: boolean;
  followersCount: number;
  pending: boolean;
  toggle: () => Promise<void>;
}

export function useFollowToggle(
  sub: string,
  initialFollowing: boolean,
  initialFollowersCount: number,
  onChange?: (next: { following: boolean; followersCount: number }) => void,
): FollowToggleState {
  const client = useFujuClient();
  const [following, setFollowing] = useState(initialFollowing);
  const [followersCount, setFollowersCount] = useState(initialFollowersCount);
  const [pending, setPending] = useState(false);

  const toggle = useCallback(async () => {
    if (pending) return;
    const nextFollowing = !following;
    const optimisticCount = Math.max(0, followersCount + (nextFollowing ? 1 : -1));
    setFollowing(nextFollowing);
    setFollowersCount(optimisticCount);
    setPending(true);
    try {
      const res = nextFollowing
        ? await follow(client, sub)
        : await unfollow(client, sub);
      setFollowing(res.data.following);
      setFollowersCount(res.data.followers_count);
      onChange?.({
        following: res.data.following,
        followersCount: res.data.followers_count,
      });
    } catch (e) {
      setFollowing(following);
      setFollowersCount(followersCount);
      onChange?.({ following, followersCount });
      throw e;
    } finally {
      setPending(false);
    }
  }, [client, sub, following, followersCount, pending, onChange]);

  return { following, followersCount, pending, toggle };
}
