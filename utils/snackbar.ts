/**
 * A tiny, app-global snackbar channel for the one case the native `toast`
 * (burnt) can't cover: a transient message with an actionable button (Undo).
 *
 * A single `SnackbarHost` mounted near the app root subscribes; callers fire
 * `snackbar.show(...)` from anywhere (including a modal that's about to close),
 * so the message survives the navigation back. The undo target is described by
 * data (`kind` + `id`) rather than a closure, so the host — which outlives the
 * screen that triggered it — can run the reversal against a stable mutation.
 */
export type SnackbarUndoTarget = { kind: 'category' | 'categoryItem'; id: string };

export type SnackbarOptions = {
  /** Already-localized message shown on the left. */
  message: string;
  /** When set, an "Undo" button reverses this archive. */
  undo?: SnackbarUndoTarget;
};

type Listener = (options: SnackbarOptions) => void;

let listener: Listener | null = null;

export const snackbar = {
  show(options: SnackbarOptions): void {
    listener?.(options);
  },
};

/** Registers the host. Only one host is expected; the last to subscribe wins. */
export function subscribeSnackbar(next: Listener): () => void {
  listener = next;
  return () => {
    if (listener === next) listener = null;
  };
}
