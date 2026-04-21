import { Button } from '../primitives/Button';

interface FollowButtonProps {
  following: boolean;
  pending?: boolean;
  disabled?: boolean;
  onToggle: () => void;
}

export function FollowButton({ following, pending, disabled, onToggle }: FollowButtonProps) {
  return (
    <Button
      variant={following ? 'secondary' : 'primary'}
      disabled={disabled || pending}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
    >
      {pending ? '...' : following ? 'フォロー解除' : 'フォロー'}
    </Button>
  );
}
