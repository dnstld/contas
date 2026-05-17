export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export type TransactionStatus = 'completed' | 'scheduled';

export type TransactionType = 'expense' | 'income';

export type Category = {
  id: string;
  name: string;
  type: TransactionType;
  monthlyBudget?: number;
  createdAt?: string;
};

export type Transaction = {
  id: string;
  type: TransactionType;
  categoryId: string;
  categoryName: string;
  amount: number;
  description: string;
  status: TransactionStatus;
  recurrence: Recurrence;
  date?: string;
  startDate?: string;
  nextOccurrence?: string;
};

export type Finance = {
  generatedAt: string;
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
