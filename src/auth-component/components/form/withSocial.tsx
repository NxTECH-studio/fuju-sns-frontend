import { Button } from './button';
import { type SocialProvider } from '../../types';

const PROVIDER_LABELS: Record<SocialProvider, string> = {
  google: 'Google',
  twitch: 'Twitch',
  x: 'X',
};

interface Props {
  providers: readonly SocialProvider[];
  onClick?: (provider: SocialProvider) => void;
}

const Social = (props: Props) => {
  return (
    <div data-fuju-auth-social>
      {props.providers.map((p) => (
        <Button
          key={p}
          type="button"
          onClick={() => props.onClick?.(p)}
          data-fuju-auth-provider={p}
          style={{ width: 'fit-content', marginTop: '1em' }}
        >
          {PROVIDER_LABELS[p]}で登録
        </Button>
      ))}
    </div>
  );
};

export { Social };
