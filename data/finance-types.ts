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
};

export type OneOffTransaction = TransactionBase & {
  kind: 'one-off';
  recurrence: 'none';
  date: string;
};

export type RecurringTransaction = TransactionBase & {
  kind: 'recurring';
  recurrence: RecurringRecurrence;
  startDate: string;
  nextOccurrence: string;
};

export type Transaction = OneOffTransaction | RecurringTransaction;

/** Most reporting code only cares about a single canonical timestamp. */
export function transactionDate(t: Transaction): string {
  return t.kind === 'one-off' ? t.date : t.startDate;
}

/** The canonical timestamp as a `Date`. Single place that turns a transaction
 *  into a date object (an invalid stored date yields an `Invalid Date`, never
 *  `null`, matching `new Date(...)`). */
export function txDate(t: Transaction): Date {
  return new Date(transactionDate(t));
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
