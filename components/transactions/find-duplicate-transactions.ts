import { transactionDate, type Transaction } from '@/data/finance-types';

export type DuplicateCandidate = {
  date: Date;
  amountCents: number;
  categoryId: string | null;
};

function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${y}-${m}-${day}`;
}

export function findDuplicateTransactions(
  candidate: DuplicateCandidate,
  existing: readonly Transaction[],
): Transaction[] {
  if (!candidate.categoryId) return [];
  const candidateDay = localDayKey(candidate.date);
  return existing.filter((t) => {
    if (t.categoryId !== candidate.categoryId) return false;
    if (Math.round(t.amount * 100) !== candidate.amountCents) return false;
    return localDayKey(new Date(transactionDate(t))) === candidateDay;
  });
}
