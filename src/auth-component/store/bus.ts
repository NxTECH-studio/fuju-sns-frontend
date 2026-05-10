export type BusEvent = { type: 'logout' } | { type: 'login-completed'; at: number };

const CHANNEL_NAME = 'fuju-auth-bus';

export interface Bus {
  post(ev: BusEvent): void;
  subscribe(handler: (ev: BusEvent) => void): () => void;
  close(): void;
}

export function createBus(): Bus {
  const Channel = globalThis.BroadcastChannel;
  if (Channel === undefined) {
    return {
      post() {
        /* no-op */
      },
      subscribe() {
        return () => undefined;
      },
      close() {
        /* no-op */
      },
    };
  }
  const channel = new Channel(CHANNEL_NAME);
  return {
    post(ev) {
      try {
        channel.postMessage(ev);
      } catch {
        /* ignore */
      }
    },
    subscribe(handler) {
      const listener = (ev: MessageEvent) => {
        handler(ev.data as BusEvent);
      };
      channel.addEventListener('message', listener);
      return () => channel.removeEventListener('message', listener);
    },
    close() {
      try {
        channel.close();
      } catch {
        /* ignore */
      }
    },
  };
}
