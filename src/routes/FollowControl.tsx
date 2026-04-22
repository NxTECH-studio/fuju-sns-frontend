import { useFollowToggle } from "../hooks/useFollowToggle";
import { useToast } from "../state/toastContext";
import { FollowButton } from "../ui/components/FollowButton";

interface FollowControlProps {
  sub: string;
  initialFollowing: boolean;
  initialFollowersCount: number;
  onCountChange?: (next: { followersCount: number }) => void;
}

// Integration glue: owns a per-target useFollowToggle and wires toast
// for failures. Callers re-mount via `key` when they need to seed new
// initial values (swagger does not return follow state on /users/:sub so
// we infer from the user's timeline and reseed when it loads).
export function FollowControl({
  sub,
  initialFollowing,
  initialFollowersCount,
  onCountChange,
}: FollowControlProps) {
  const toast = useToast();
  const follow = useFollowToggle(
    sub,
    initialFollowing,
    initialFollowersCount,
    onCountChange
      ? (next) => onCountChange({ followersCount: next.followersCount })
      : undefined
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
