import { useFollowToggle } from "../hooks/useFollowToggle";
import { useToast } from "../state/toastContext";
import { FollowButton } from "../ui/components/FollowButton";

interface FollowControlProps {
  sub: string;
  initialFollowing: boolean;
  initialFollowersCount: number;
  onCountChange?: (next: { followersCount: number }) => void;
  // Mirror following-state changes back to the owner (e.g. useFollowState)
  // so it stays in sync with optimistic updates / server confirmations.
  onFollowingChange?: (next: boolean) => void;
}

// Integration glue: owns a per-target useFollowToggle and wires toast
// for failures. Callers re-mount via `key` when they need to seed new
// initial values (swagger does not return follow state on /users/:sub so
// we resolve it via useFollowState and reseed when the lookup settles).
export function FollowControl({
  sub,
  initialFollowing,
  initialFollowersCount,
  onCountChange,
  onFollowingChange,
}: FollowControlProps) {
  const toast = useToast();
  const follow = useFollowToggle(
    sub,
    initialFollowing,
    initialFollowersCount,
    (next) => {
      if (onCountChange) onCountChange({ followersCount: next.followersCount });
      if (onFollowingChange) onFollowingChange(next.following);
    }
  );

  const handle = async () => {
    try {
      await follow.toggle();
    } catch (e) {
      toast.show(
        e instanceof Error ? e.message : "フォローに失敗しました",
        "error"
      );
    }
  };

  return (
    <FollowButton
      following={follow.following}
      pending={follow.pending}
      onToggle={() => void handle()}
    />
  );
}
