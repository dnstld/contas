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

// Signals that a category item was created / updated / archived / deleted from
// the `category-item-form` modal. The opener (items modal, categories tab)
// subscribes so it can refresh once the form closes. Payload = the item id.
export const categoryItemFormBridge = createChannel<{
  changed: string;
}>();

// Carries the "What for" choice from the `item-select` modal back to the
// transaction form. Unlike categories, an item description can be free text, so
// there are two outcomes:
//  - `selected`: an existing or just-created curated item was chosen. The
//    payload carries `name` + `defaultAmount` (not just the id) so the form can
//    apply the selection immediately without waiting for the `categoryItems`
//    query to refetch — this also covers the "created inline then selected"
//    case with no race against query invalidation.
//  - `useText`: the typed query is used as a plain description with no item link.
export const categoryItemSelectBridge = createChannel<{
  selected: { id: string; name: string; defaultAmount: number | null };
  useText: string;
}>();

export function makeBridgeId(): string {
  return `bridge-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}
