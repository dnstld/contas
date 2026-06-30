import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

/**
 * Calls `onForeground` when the app returns to the foreground on a real
 * `'background' → 'active'` transition — ignoring transient `'inactive'` states
 * (control center, notification banner) which don't represent the user leaving
 * the app.
 *
 * iOS surfaces the foreground sequence as `background → inactive → active`, so
 * we set a flag the moment we see `'background'` and consume it on the next
 * `'active'`.
 *
 * `onForeground` is read from a ref, so the AppState listener subscribes exactly
 * once and is never torn down/re-added when the callback identity changes.
 */
export function useAppForeground(onForeground: () => void): void {
  const callbackRef = useRef(onForeground);
  callbackRef.current = onForeground;
  const wasBackgroundedRef = useRef(false);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background') {
        wasBackgroundedRef.current = true;
        return;
      }
      if (next === 'active' && wasBackgroundedRef.current) {
        wasBackgroundedRef.current = false;
        callbackRef.current();
      }
    });
    return () => sub.remove();
  }, []);
}
