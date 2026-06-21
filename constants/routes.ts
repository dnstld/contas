import type { Href } from 'expo-router';

import type { TransactionType } from '@/data/finance-types';
import type { TimeFilterState } from '@/hooks/use-time-filter';

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
  createTransaction: '/create' satisfies Href,
  editDisplayName: '/edit-display-name' satisfies Href,
  redeemCode: '/redeem-code' satisfies Href,
} as const;

export function editTransactionHref(id: string): Href {
  return { pathname: '/edit', params: { id } };
}

export function categoryDetailHref(id: string, filter: TimeFilterState): Href {
  return {
    pathname: '/category/[id]',
    params: {
      id,
      years: filter.years.join(','),
      months: filter.months.join(','),
      all: filter.all ? '1' : '0',
    },
  };
}

export function walletsHref(): Href {
  return { pathname: '/wallets' };
}

export function categoryFormHref(args: {
  type?: TransactionType;
  bridgeId: string;
  editId?: string;
  prefillName?: string;
}): Href {
  return {
    pathname: '/category-form',
    params: {
      bridgeId: args.bridgeId,
      ...(args.type ? { type: args.type } : {}),
      ...(args.editId ? { editId: args.editId } : {}),
      ...(args.prefillName ? { prefillName: args.prefillName } : {}),
    },
  };
}
