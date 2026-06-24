type Handler<P> = (payload: P) => void;

type ChannelHandlers<Events extends Record<string, unknown>> = {
  [K in keyof Events]?: Handler<Events[K]>;
};

function createChannel<Events extends Record<string, unknown>>() {
  const subscribers = new Map<string, ChannelHandlers<Events>>();

  function subscribe(bridgeId: string, handlers: ChannelHandlers<Events>): () => void {
    subscribers.set(bridgeId, handlers);
    return () => {
      if (subscribers.get(bridgeId) === handlers) subscribers.delete(bridgeId);
    };
  }

  function emit<K extends keyof Events>(bridgeId: string, event: K, payload: Events[K]): void {
    subscribers.get(bridgeId)?.[event]?.(payload);
  }

  return { subscribe, emit };
}

export const categoryFormBridge = createChannel<{
  created: string;
  deleted: string;
  selected: string;
}>();

export function makeBridgeId(): string {
  return `bridge-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}
