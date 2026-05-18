import type { Href } from 'expo-router';

/**
 * Centralised route constants. Renaming a file in `app/` will update the
 * generated `expo-router` typed-routes; consolidating call sites here makes
 * the rename surface land in one place rather than a grep across the tree.
 *
 * All consts are typed `Href` — TypeScript will reject any string not in the
 * generated `app/` routes graph.
 */
export const ROUTES = {
  authentication: '/authentication' satisfies Href,
  home: '/(tabs)/(status)' satisfies Href,
  account: '/(tabs)/account' satisfies Href,
  transactions: '/(tabs)/transactions' satisfies Href,
  createTransaction: '/create' satisfies Href,
} as const;

export function editTransactionHref(id: string): Href {
  return { pathname: '/edit', params: { id } };
}
