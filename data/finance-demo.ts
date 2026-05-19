import { transactionDate, type Category, type Finance, type Transaction } from './finance-types';

type DemoCategory = Category & {
  behavior: {
    minEntriesPerMonth: number;
    maxEntriesPerMonth: number;
    minAmount: number;
    maxAmount: number;
    recurring?: boolean;
  };
};

const CURRENT_DATE = new Date();
const CURRENT_YEAR = CURRENT_DATE.getFullYear();
const CURRENT_MONTH = CURRENT_DATE.getMonth();
const CURRENT_DAY = CURRENT_DATE.getDate();
const PREVIOUS_YEAR = CURRENT_YEAR - 1;

const YEARS = [PREVIOUS_YEAR, CURRENT_YEAR];

function isFutureMonth(year: number, month: number): boolean {
  if (year > CURRENT_YEAR) return true;
  if (year === CURRENT_YEAR && month > CURRENT_MONTH) return true;
  return false;
}

function maxDayForMonth(year: number, month: number): number {
  if (year === CURRENT_YEAR && month === CURRENT_MONTH) return CURRENT_DAY;
  return 28;
}

const categories: DemoCategory[] = [
  {
    id: 'mercado',
    name: 'Mercado',
    type: 'expense',
    monthlyBudget: 900,
    behavior: {
      minEntriesPerMonth: 4,
      maxEntriesPerMonth: 12,
      minAmount: 10,
      maxAmount: 175,
    },
  },
  {
    id: 'alimentacao',
    name: 'Alimentação',
    type: 'expense',
    monthlyBudget: 600,
    behavior: {
      minEntriesPerMonth: 3,
      maxEntriesPerMonth: 18,
      minAmount: 8,
      maxAmount: 90,
    },
  },
  {
    id: 'moradia',
    name: 'Moradia',
    type: 'expense',
    monthlyBudget: 1600,
    behavior: {
      minEntriesPerMonth: 2,
      maxEntriesPerMonth: 5,
      minAmount: 40,
      maxAmount: 2000,
      recurring: true,
    },
  },
  {
    id: 'transporte',
    name: 'Transporte',
    type: 'expense',
    monthlyBudget: 450,
    behavior: {
      minEntriesPerMonth: 6,
      maxEntriesPerMonth: 25,
      minAmount: 4,
      maxAmount: 300,
    },
  },
  {
    id: 'saude',
    name: 'Saúde',
    type: 'expense',
    monthlyBudget: 400,
    behavior: {
      minEntriesPerMonth: 0,
      maxEntriesPerMonth: 8,
      minAmount: 5,
      maxAmount: 600,
    },
  },
  {
    id: 'compras',
    name: 'Compras',
    type: 'expense',
    monthlyBudget: 750,
    behavior: {
      minEntriesPerMonth: 1,
      maxEntriesPerMonth: 10,
      minAmount: 10,
      maxAmount: 1000,
    },
  },
  {
    id: 'lazer',
    name: 'Lazer',
    type: 'expense',
    monthlyBudget: 350,
    behavior: {
      minEntriesPerMonth: 2,
      maxEntriesPerMonth: 15,
      minAmount: 5,
      maxAmount: 200,
    },
  },
  {
    id: 'trabalho_ferramentas',
    name: 'Trabalho & Ferramentas',
    type: 'expense',
    monthlyBudget: 450,
    behavior: {
      minEntriesPerMonth: 1,
      maxEntriesPerMonth: 6,
      minAmount: 8,
      maxAmount: 750,
      recurring: true,
    },
  },
  {
    id: 'viagens',
    name: 'Viagens',
    type: 'expense',
    monthlyBudget: 1250,
    behavior: {
      minEntriesPerMonth: 0,
      maxEntriesPerMonth: 2,
      minAmount: 100,
      maxAmount: 4000,
    },
  },
  {
    id: 'receitas',
    name: 'Receitas',
    type: 'income',
    behavior: {
      minEntriesPerMonth: 1,
      maxEntriesPerMonth: 2,
      minAmount: 175,
      maxAmount: 2250,
    },
  },
];

const descriptions: Record<string, string[]> = {
  mercado: ['Carrefour', 'Assaí', 'Pão de Açúcar', 'Atacadão'],
  alimentacao: ['iFood', 'Outback', 'McDonalds', 'Pizza'],
  moradia: ['Aluguel', 'Enel', 'Vivo Fibra', 'Condomínio'],
  transporte: ['Uber', '99', 'Shell', 'Ipiranga'],
  saude: ['Drogasil', 'Fleury', 'Consulta médica'],
  compras: ['Amazon', 'Mercado Livre', 'Shopee', 'Renner'],
  lazer: ['Netflix', 'Spotify', 'Cinema', 'Barzinho'],
  trabalho_ferramentas: ['ChatGPT', 'Figma', 'Apple', 'Grammarly'],
  viagens: ['LATAM', 'Booking', 'Airbnb'],
  receitas: ['Salário', 'Freelance'],
};

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function randomBetween(min: number, max: number, seed: number) {
  return min + seededRandom(seed) * (max - min);
}

function randomInt(min: number, max: number, seed: number) {
  return Math.floor(randomBetween(min, max + 1, seed));
}

function pickRandom<T>(array: T[], seed: number): T {
  return array[Math.floor(seededRandom(seed) * array.length)]!;
}

function formatAmount(value: number) {
  return Number(value.toFixed(2));
}

function createTransactionId(index: number) {
  return `txn_${String(index).padStart(6, '0')}`;
}

function generateFreelanceAmount(seed: number) {
  const chance = seededRandom(seed);

  if (chance < 0.3) {
    return null;
  }

  return formatAmount(randomBetween(75, 600, seed + 99));
}

// Months in which expenses outpace revenue. The remaining 8 months are surplus.
// Spread across the year so deficits don't cluster.
const DEFICIT_MONTHS = new Set<number>([2, 5, 8, 11]); // Mar, Jun, Sep, Dec

const SURPLUS_RATIO = 1.2; // salary covers 120% of that month's expenses
const DEFICIT_RATIO = 0.7; // salary covers 70% of that month's expenses

// Per-month expense scaling. Designed so that most month-over-month comparisons
// trend down (green). The few up-ticks (Apr, Aug) provide realistic variety.
// Index = month (0=Jan ... 11=Dec).
const MONTH_INTENSITY = [
  1.0, 0.9, 0.85, 1.1, 0.9, 0.85, 0.95, 1.05, 0.85, 0.95, 0.9, 0.85,
] as const;

// Year-over-year scaling. The previous year's baseline is higher so the current
// year's totals look better in year-mode comparisons.
const YEAR_INTENSITY: Record<number, number> = {
  [PREVIOUS_YEAR]: 1.2,
  [CURRENT_YEAR]: 1.0,
};

function expenseScale(year: number, month: number): number {
  return (MONTH_INTENSITY[month] ?? 1) * (YEAR_INTENSITY[year] ?? 1);
}

function sumMonthExpenses(transactions: Transaction[], year: number, month: number): number {
  let sum = 0;
  for (const t of transactions) {
    if (t.status !== 'completed' || t.type !== 'expense') continue;
    const d = new Date(transactionDate(t));
    if (d.getFullYear() === year && d.getMonth() === month) sum += t.amount;
  }
  return sum;
}

export function generateDemoFinance(currency: string = 'BRL'): Finance {
  const transactions: Transaction[] = [];

  let txIndex = 1;

  YEARS.forEach((year) => {
    for (let month = 0; month < 12; month++) {
      if (isFutureMonth(year, month)) continue;
      const maxDay = maxDayForMonth(year, month);

      categories.forEach((category, categoryIndex) => {
        const seed = year * 1000 + month * 100 + categoryIndex;

        if (category.id === 'receitas') {
          const monthExpenses = sumMonthExpenses(transactions, year, month);
          const isDeficit = DEFICIT_MONTHS.has(month);
          const salary = formatAmount(monthExpenses * (isDeficit ? DEFICIT_RATIO : SURPLUS_RATIO));

          const salaryMaxDay = Math.min(5, maxDay);
          if (salaryMaxDay >= 1) {
            const salaryDate = new Date(year, month, randomInt(1, salaryMaxDay, seed));

            transactions.push({
              id: createTransactionId(txIndex++),
              kind: 'one-off',
              type: 'income',
              categoryId: category.id,
              categoryName: category.name,
              amount: salary,
              description: 'Salário',
              status: 'completed',
              recurrence: 'none',
              date: salaryDate.toISOString(),
            });
          }

          if (!isDeficit && maxDay >= 10) {
            const freelanceAmount = generateFreelanceAmount(seed);

            if (freelanceAmount) {
              const freelanceMaxDay = Math.min(28, maxDay);
              const freelanceDate = new Date(
                year,
                month,
                randomInt(10, freelanceMaxDay, seed + 20),
              );

              transactions.push({
                id: createTransactionId(txIndex++),
                kind: 'one-off',
                type: 'income',
                categoryId: category.id,
                categoryName: category.name,
                amount: freelanceAmount,
                description: 'Freelance',
                status: 'completed',
                recurrence: 'none',
                date: freelanceDate.toISOString(),
              });
            }
          }

          return;
        }

        const scale = expenseScale(year, month);

        const entryCount = randomInt(
          category.behavior.minEntriesPerMonth,
          category.behavior.maxEntriesPerMonth,
          seed,
        );

        const expenseMaxDay = Math.min(28, maxDay);

        for (let i = 0; i < entryCount; i++) {
          const amount = formatAmount(
            randomBetween(category.behavior.minAmount, category.behavior.maxAmount, seed + i) *
              scale,
          );

          const transactionDate = new Date(year, month, randomInt(1, expenseMaxDay, seed + i + 10));

          transactions.push({
            id: createTransactionId(txIndex++),
            kind: 'one-off',
            type: 'expense',
            categoryId: category.id,
            categoryName: category.name,
            amount,
            description: pickRandom(descriptions[category.id] ?? [category.name], seed + i + 50),
            status: 'completed',
            recurrence: 'none',
            date: transactionDate.toISOString(),
          });
        }

        if (category.behavior.recurring && maxDay >= 5) {
          const scheduledDate = new Date(year, month, 5);

          transactions.push({
            id: createTransactionId(txIndex++),
            kind: 'recurring',
            type: 'expense',
            categoryId: category.id,
            categoryName: category.name,
            amount: formatAmount(
              randomBetween(category.behavior.minAmount, category.behavior.maxAmount, seed + 999) *
                scale,
            ),
            description: `${category.name} recorrente`,
            status: 'scheduled',
            recurrence: 'monthly',
            startDate: scheduledDate.toISOString(),
            nextOccurrence: new Date(year, month + 1, 5).toISOString(),
          });
        }
      });
    }
  });

  const publicCategories: Category[] = categories.map(({ behavior: _behavior, ...rest }) => rest);

  return {
    years: YEARS,
    currency,
    categories: publicCategories,
    transactions: transactions.sort((a, b) => {
      const dateA = new Date(transactionDate(a)).getTime();
      const dateB = new Date(transactionDate(b)).getTime();
      return dateB - dateA;
    }),
  };
}
