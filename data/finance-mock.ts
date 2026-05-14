type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly'

type TransactionStatus = 'completed' | 'scheduled'

type TransactionType = 'expense' | 'income'

export type Category = {
  id: string
  name: string
  type: TransactionType
  monthlyBudget?: number
  behavior: {
    minEntriesPerMonth: number
    maxEntriesPerMonth: number
    minAmount: number
    maxAmount: number
    recurring?: boolean
  }
}

export type Transaction = {
  id: string
  type: TransactionType
  categoryId: string
  categoryName: string
  amount: number
  description: string
  status: TransactionStatus
  recurrence: Recurrence
  date?: string
  startDate?: string
  nextOccurrence?: string
}

export type FinanceMock = {
  generatedAt: string
  years: number[]
  currency: 'BRL'
  categories: Category[]
  transactions: Transaction[]
}

const CURRENT_DATE = new Date()
const CURRENT_YEAR = CURRENT_DATE.getFullYear()
const PREVIOUS_YEAR = CURRENT_YEAR - 1

const YEARS = [PREVIOUS_YEAR, CURRENT_YEAR]

const categories: Category[] = [
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
]

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
}

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function randomBetween(min: number, max: number, seed: number) {
  return min + seededRandom(seed) * (max - min)
}

function randomInt(min: number, max: number, seed: number) {
  return Math.floor(randomBetween(min, max + 1, seed))
}

function pickRandom<T>(array: T[], seed: number): T {
  return array[Math.floor(seededRandom(seed) * array.length)]
}

function formatAmount(value: number) {
  return Number(value.toFixed(2))
}

function createTransactionId(index: number) {
  return `txn_${String(index).padStart(6, '0')}`
}

function generateFreelanceAmount(seed: number) {
  const chance = seededRandom(seed)

  if (chance < 0.3) {
    return null
  }

  return formatAmount(randomBetween(75, 600, seed + 99))
}

// Months in which expenses outpace revenue. The remaining 8 months are surplus.
// Spread across the year so deficits don't cluster.
const DEFICIT_MONTHS = new Set<number>([2, 5, 8, 11]) // Mar, Jun, Sep, Dec

const SURPLUS_RATIO = 1.2 // salary covers 120% of that month's expenses
const DEFICIT_RATIO = 0.7 // salary covers 70% of that month's expenses

// Per-month expense scaling. Designed so that most month-over-month comparisons
// trend down (green). The few up-ticks (Apr, Aug) provide realistic variety.
// Index = month (0=Jan ... 11=Dec).
const MONTH_INTENSITY = [
  1.0, 0.9, 0.85, 1.1, 0.9, 0.85, 0.95, 1.05, 0.85, 0.95, 0.9, 0.85,
] as const

// Year-over-year scaling. The previous year's baseline is higher so the current
// year's totals look better in year-mode comparisons.
const YEAR_INTENSITY: Record<number, number> = {
  [PREVIOUS_YEAR]: 1.2,
  [CURRENT_YEAR]: 1.0,
}

function expenseScale(year: number, month: number): number {
  return MONTH_INTENSITY[month] * (YEAR_INTENSITY[year] ?? 1)
}

function sumMonthExpenses(transactions: Transaction[], year: number, month: number): number {
  let sum = 0
  for (const t of transactions) {
    if (t.status !== 'completed' || t.type !== 'expense' || !t.date) continue
    const d = new Date(t.date)
    if (d.getFullYear() === year && d.getMonth() === month) sum += t.amount
  }
  return sum
}

export function generateFinanceMock(): FinanceMock {
  const transactions: Transaction[] = []

  let txIndex = 1

  YEARS.forEach((year) => {
    for (let month = 0; month < 12; month++) {
      categories.forEach((category, categoryIndex) => {
        const seed = year * 1000 + month * 100 + categoryIndex

        if (category.id === 'receitas') {
          // Compute this month's expenses (already pushed by earlier categories)
          // and size the salary so 8/12 months are surplus, 4/12 are deficit.
          const monthExpenses = sumMonthExpenses(transactions, year, month)
          const isDeficit = DEFICIT_MONTHS.has(month)
          const salary = formatAmount(
            monthExpenses * (isDeficit ? DEFICIT_RATIO : SURPLUS_RATIO),
          )

          const salaryDate = new Date(year, month, randomInt(1, 5, seed))

          transactions.push({
            id: createTransactionId(txIndex++),
            type: 'income',
            categoryId: category.id,
            categoryName: category.name,
            amount: salary,
            description: 'Salário',
            status: 'completed',
            recurrence: 'monthly',
            date: salaryDate.toISOString(),
          })

          // Freelance only in surplus months — keeps deficit months actually negative.
          if (!isDeficit) {
            const freelanceAmount = generateFreelanceAmount(seed)

            if (freelanceAmount) {
              const freelanceDate = new Date(year, month, randomInt(10, 28, seed + 20))

              transactions.push({
                id: createTransactionId(txIndex++),
                type: 'income',
                categoryId: category.id,
                categoryName: category.name,
                amount: freelanceAmount,
                description: 'Freelance',
                status: 'completed',
                recurrence: 'none',
                date: freelanceDate.toISOString(),
              })
            }
          }

          return
        }

        const scale = expenseScale(year, month)

        const entryCount = randomInt(
          category.behavior.minEntriesPerMonth,
          category.behavior.maxEntriesPerMonth,
          seed,
        )

        for (let i = 0; i < entryCount; i++) {
          const amount = formatAmount(
            randomBetween(
              category.behavior.minAmount,
              category.behavior.maxAmount,
              seed + i,
            ) * scale,
          )

          const transactionDate = new Date(
            year,
            month,
            randomInt(1, 28, seed + i + 10),
          )

          transactions.push({
            id: createTransactionId(txIndex++),
            type: 'expense',
            categoryId: category.id,
            categoryName: category.name,
            amount,
            description: pickRandom(descriptions[category.id], seed + i + 50),
            status: 'completed',
            recurrence: 'none',
            date: transactionDate.toISOString(),
          })
        }

        if (category.behavior.recurring) {
          const scheduledDate = new Date(year, month, 5)

          transactions.push({
            id: createTransactionId(txIndex++),
            type: 'expense',
            categoryId: category.id,
            categoryName: category.name,
            amount: formatAmount(
              randomBetween(
                category.behavior.minAmount,
                category.behavior.maxAmount,
                seed + 999,
              ) * scale,
            ),
            description: `${category.name} recorrente`,
            status: 'scheduled',
            recurrence: 'monthly',
            startDate: scheduledDate.toISOString(),
            nextOccurrence: new Date(year, month + 1, 5).toISOString(),
          })
        }
      })
    }
  })

  return {
    generatedAt: new Date().toISOString(),
    years: YEARS,
    currency: 'BRL',
    categories,
    transactions: transactions.sort((a, b) => {
      const dateA = new Date(a.date || a.startDate || '').getTime()
      const dateB = new Date(b.date || b.startDate || '').getTime()

      return dateB - dateA
    }),
  }
}
