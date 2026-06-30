import { useState } from 'react';

import { useAppForeground } from '@/hooks/use-app-foreground';

/**
 * Returns a `Date` snapshot that is refreshed whenever the app comes back to
 * the foreground from a real `'background'` — not from transient `'inactive'`
 * states (control center, notification banner) which don't represent the user
 * leaving the app.
 *
 * The identity of the returned `Date` is stable between activations, so it is
 * safe to use as a dependency for memoization.
 */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useAppForeground(() => setNow(new Date()));
  return now;
}
