import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

/**
 * Returns a `Date` snapshot that is refreshed whenever the app comes back to
 * the foreground from a real `'background'` — not from transient `'inactive'`
 * states (control center, notification banner) which don't represent the user
 * leaving the app.
 *
 * iOS surfaces the foreground sequence as `background → inactive → active`,
 * so we set a flag on `background` and consume it on the next `active`.
 *
 * The identity of the returned `Date` is stable between activations, so it is
 * safe to use as a dependency for memoization.
 */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  const wasBackgroundedRef = useRef(false);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background') {
        wasBackgroundedRef.current = true;
        return;
      }
      if (next === 'active' && wasBackgroundedRef.current) {
        wasBackgroundedRef.current = false;
        setNow(new Date());
      }
    });
    return () => sub.remove();
  }, []);

  return now;
}
