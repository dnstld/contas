import { transactionDate, type Finance, type Transaction } from '@/data/finance-types';
import { MONTHS, type TimeFilterState } from '@/hooks/use-time-filter';

export interface TransactionsSection {
  title: string;
  data: Transaction[];
}

export interface TransactionsTotals {
  income: number;
  expenses: number;
  net: number;
}

export interface TransactionsListResult {
  sections: TransactionsSection[];
  totals: TransactionsTotals;
}

export interface DateLabels {
  today: string;
  yesterday: string;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function buildSectionLabeler(now: Date, locale: string, labels: DateLabels) {
  const today = startOfDay(now);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const todayKey = dayKey(today);
  const yesterdayKey = dayKey(yesterday);
  const currentYear = today.getFullYear();

  const sameYearFmt = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
  });
  const otherYearFmt = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (d: Date): string => {
    const key = dayKey(d);
    if (key === todayKey) return labels.today;
    if (key === yesterdayKey) return labels.yesterday;
    return d.getFullYear() === currentYear ? sameYearFmt.format(d) : otherYearFmt.format(d);
  };
}

export function buildTransactionsList(
  mock: Finance,
  filter: TimeFilterState,
  now: Date,
  locale: string,
  labels: DateLabels,
): TransactionsListResult {
  const year = filter.years[0] ?? now.getFullYear();
  const monthKey = filter.all ? undefined : (filter.months[0] ?? MONTHS[now.getMonth()]);
  const monthIndex = monthKey ? MONTHS.indexOf(monthKey) : undefined;

  const filtered: { tx: Transaction; date: Date }[] = [];
  let income = 0;
  let expenses = 0;

  for (const tx of mock.transactions) {
    if (tx.status !== 'completed') continue;
    const date = new Date(transactionDate(tx));
    if (date.getFullYear() !== year) continue;
    if (monthIndex !== undefined && date.getMonth() !== monthIndex) continue;

    filtered.push({ tx, date });
    if (tx.type === 'income') income += tx.amount;
    else expenses += tx.amount;
  }

  filtered.sort((a, b) => b.date.getTime() - a.date.getTime());

  const labelFor = buildSectionLabeler(now, locale, labels);
  const sections: TransactionsSection[] = [];
  let currentKey: string | null = null;

  for (const { tx, date } of filtered) {
    const key = dayKey(date);
    if (key !== currentKey) {
      sections.push({ title: labelFor(date), data: [tx] });
      currentKey = key;
    } else {
      sections[sections.length - 1].data.push(tx);
    }
  }

  return {
    sections,
    totals: { income, expenses, net: income - expenses },
  };
}
