export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export type RecurringRecurrence = Exclude<Recurrence, 'none'>;

export type TransactionStatus = 'completed' | 'scheduled';

export type TransactionType = 'expense' | 'income';

export type Category = {
  id: string;
  name: string;
  type: TransactionType;
  monthlyBudget?: number;
  createdAt?: string;
};

type TransactionBase = {
  id: string;
  type: TransactionType;
  categoryId: string;
  categoryName: string;
  amount: number;
  description: string;
  status: TransactionStatus;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string | null;
  /** Member this transaction is FOR. `null` = for its creator (see `created_by`). */
  onBehalfOfUserId: string | null;
};

export type OneOffTransaction = TransactionBase & {
  kind: 'one-off';
  recurrence: 'none';
  /** Calendar day the transaction occurred, `YYYY-MM-DD` (no time/zone). */
  date: string;
};

export type RecurringTransaction = TransactionBase & {
  kind: 'recurring';
  recurrence: RecurringRecurrence;
  /** Calendar day, `YYYY-MM-DD` (no time/zone). */
  startDate: string;
  /** Calendar day, `YYYY-MM-DD` (no time/zone). */
  nextOccurrence: string;
};

export type Transaction = OneOffTransaction | RecurringTransaction;

/** Most reporting code only cares about a single canonical date. Stored as a
 *  `YYYY-MM-DD` calendar day (no time, no timezone). */
export function transactionDate(t: Transaction): string {
  return t.kind === 'one-off' ? t.date : t.startDate;
}

/** Leading `YYYY-MM-DD` of a stored date. Tolerates a full ISO string (legacy
 *  rows) by reading only its date portion. */
const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})/;

/**
 * Format a `Date` as a `YYYY-MM-DD` day string from its LOCAL calendar day —
 * the day the user actually sees and picks, independent of time-of-day or
 * timezone. This is the canonical form persisted for a transaction's date.
 */
export function toDayString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parse a stored day string to a `Date` at LOCAL midnight, built from parts.
 * Never `new Date('2026-07-06')` — that parses as UTC and shifts the calendar
 * day in negative-offset zones. Building from parts keeps the day stable for
 * every viewer, so the app's local getters (`getFullYear`/`getMonth`/`getDate`)
 * always report the intended day. An unparseable value yields an `Invalid Date`.
 */
export function parseDayStart(day: string): Date {
  const m = DAY_RE.exec(day);
  if (!m) return new Date(day);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** The canonical date as a local-midnight `Date`. Single place that turns a
 *  transaction into a date object. */
export function txDate(t: Transaction): Date {
  return parseDayStart(transactionDate(t));
}

export type Finance = {
  years: number[];
  currency: string;
  categories: Category[];
  transactions: Transaction[];
};

export type WalletMember = {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  joinedAt: string;
};

export type WalletWithMeta = {
  id: string;
  name: string;
  currency: string;
  memberCount: number;
  members: WalletMember[];
  createdAt: string;
  pendingDeleteRequest: { requestedByUserId: string; createdAt: string } | null;
};

export type DeleteWalletResult = 'deleted' | 'pending';
