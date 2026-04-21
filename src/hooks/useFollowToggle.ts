import { useCallback, useRef, useState } from "react";
import { follow, unfollow } from "../api/endpoints/follows";
import { toFollowResultVM } from "../services/mappers";
import { useFujuClient } from "./useFujuClient";

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
  onChange?: (next: { following: boolean; followersCount: number }) => void
): FollowToggleState {
  const client = useFujuClient();
  const [following, setFollowing] = useState(initialFollowing);
  const [followersCount, setFollowersCount] = useState(initialFollowersCount);
  const [pending, setPending] = useState(false);
  // Mirror state in refs so rollback captures pre-click values regardless
  // of closure staleness after server updates.
  const stateRef = useRef({
    following: initialFollowing,
    followersCount: initialFollowersCount,
  });
  stateRef.current = { following, followersCount };

  const toggle = useCallback(async () => {
    if (pending) return;
    const prev = stateRef.current;
    const nextFollowing = !prev.following;
    const optimisticCount = Math.max(
      0,
      prev.followersCount + (nextFollowing ? 1 : -1)
    );
    setFollowing(nextFollowing);
    setFollowersCount(optimisticCount);
    setPending(true);
    try {
      const res = nextFollowing
        ? await follow(client, sub)
        : await unfollow(client, sub);
      const vm = toFollowResultVM(res.data);
      setFollowing(vm.following);
      setFollowersCount(vm.followersCount);
      onChange?.({
        following: vm.following,
        followersCount: vm.followersCount,
      });
    } catch (e) {
      setFollowing(prev.following);
      setFollowersCount(prev.followersCount);
      onChange?.({
        following: prev.following,
        followersCount: prev.followersCount,
      });
      throw e;
    } finally {
      setPending(false);
    }
  }, [client, sub, pending, onChange]);

  return { following, followersCount, pending, toggle };
}
