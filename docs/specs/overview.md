# Component 2 — Overview

The Overview is the primary financial summary card on the dashboard. It reflects the active time-filter scope (month or year) and exposes a per-lens view of expenses, revenue, and net.

All labels are sourced from i18next; all monetary, numeric, and date values are formatted via the active language and the user-selected currency. See the [Localization spec](localization.md) for the full contract.

## Scenarios

### Monthly overview display

```
Given that the user is logged in
And a specific year and a specific month are selected in the time filter
And the full-year chip is not selected
When the dashboard overview is rendered
Then it must display the total expenses for the selected month as the primary metric
And the primaryLabel must read "<prefix> <month name> <year>", uppercased, with:
  - the prefix from key "overview.primaryPrefix" (en: "Bills" / pt-BR: "Contas")
  - the month name produced by Intl.DateTimeFormat in the active language
  (e.g. pt-BR: "CONTAS MAIO 2026", en: "BILLS MAY 2026")
And it must display the previous month's total expenses as the baseline comparison
And the previous-month comparison must cross the year boundary when the selected month is January
  (e.g. January 2026 compares against December 2025)
And the comparison row must include a directional indicator (arrow + percentage) and the previous-period absolute value
And a mode badge from key "overview.modes.month" must be visible in the card header
  (en: "MONTH" / pt-BR: "MÊS")
And all monetary values must be formatted via Intl.NumberFormat using the currency's home locale (currencyLocale), independent of the UI language
  (BRL always "R$ 1.234,56"; USD always "$1,234.56"; EUR always "1.234,56 €")
```

### Daily spend-intensity tint

```
Given that the per-day spend strip ("By Day") is rendered for the selected month
When a day's tone is computed
Then it must be based on that day's spend relative to the average daily spend across the visible strip
  (the mean of all rendered days, including €0 days — not a true statistical baseline, and it shifts as the month progresses)
And a day's amount must render with the "negative" tone (red) when its spend exceeds 1.5× that average
And every other day (including all €0 days) must render with the default/neutral tone — no green tint is applied
And this strip has no arrow or delta indicator (day-over-day comparisons are too noisy to be meaningful);
  each card's footer instead shows the day's transaction count via key "transactions.countShort"
```

### Year overview display

```
Given that a specific year is selected in the time filter
And the full-year chip is selected
When the dashboard overview is rendered
Then it must display the total expenses for the selected year as the primary metric
And the primaryLabel must read "<prefix> <year>", uppercased, with the prefix from key "overview.primaryPrefix"
  (e.g. en: "BILLS 2026" / pt-BR: "CONTAS 2026")
And it must display the previous year's total expenses as the baseline comparison
And it must display a horizontal timeline below the comparison (no section header/label above it)
And the timeline must list one entry per month with that month's total
And each timeline entry's month label must come from Intl.DateTimeFormat with style "short" in the active language
And the current month must be visually highlighted in the timeline (only when the selected year is the current year)
And each timeline entry's `delta` compares that month's spending to the same month of the previous year
  (e.g. July 2026 vs. July 2025), NOT to the immediately preceding month
And each timeline cell's tone must follow "lower spending is favorable", matching the top comparison row:
  - neutral when the cell's value is 0 (no activity yet, including months in the future)
  - neutral when no delta is computable, or delta is exactly 0
  - positive (green) when delta < 0 (spent less than the same month last year)
  - negative (red) when delta > 0 (spent more than the same month last year)
And each cell's trend indicator must show both the arrow and the signed percentage (`deltaPercentage`),
  omitted only when there's no previous-year baseline to compare against (division by zero)
And a mode badge from key "overview.modes.year" must be visible in the card header
  (en: "YEAR" / pt-BR: "ANO")
```

### Comparison row format

```
Given that an overview comparison is rendered (month or year mode)
When the comparison row is displayed
Then it must be rendered by the shared `ComparisonLine` molecule (components/ui/molecules/comparison-line.tsx) —
  the same component used on each category card, so both surfaces stay in sync (see category-card.md)
And it must show, in order: a directional icon, the absolute delta amount (when nonzero), and a trailing phrase
And there is no percentage anywhere in this line (dropped in favor of the plain amount)
And the delta amount is formatted as currency via Intl.NumberFormat using the active language as the locale
  and the user-selected currency — not the previous-period's absolute value, the difference between the two
And the trailing phrase comes from one of three i18next keys under the shared "comparison" namespace, by delta sign:
  - delta > 0 → "comparison.moreThan" (en: "more than {{label}}" / pt-BR: "mais que {{label}}")
  - delta < 0 → "comparison.lessThan" (en: "less than {{label}}" / pt-BR: "menos que {{label}}")
  - delta = 0 → "comparison.sameAs"   (en: "same as {{label}}" / pt-BR: "igual a {{label}}") — no amount is shown for this case
  - {{label}} is the comparison period label (month name in the active language, or year as a 4-digit string)
  (e.g. en + USD, delta < 0: "↘ $4,700.00 less than April"; pt-BR + BRL, delta > 0: "↗ R$ 4.700,00 mais que Abril";
   year mode en + BRL, delta < 0: "↘ R$ 66,849.45 less than 2025"; delta = 0: "– same as 2025")
And the icon and tone must reflect the movement:
  - delta > 0 → up-right arrow, tone reflects favorability (red/green per "Comparison semantics")
  - delta < 0 → down-right arrow, tone reflects favorability
  - delta = 0 → minus icon, neutral muted tone (textMuted)
And the amount (when shown) is colored the same as the icon; the trailing phrase is always muted text
```

### Comparison semantics

```
Given that the comparison row is rendered
Then it must always compare current expenses to previous-period expenses, regardless of the
  "Show balance" toggle state (label from key "overview.expenses")
And a higher value must be tinted red (lower spending is the favorable outcome)
```

### Balance visibility off (default)

```
Given that the "Show balance" toggle is off
When the overview is rendered
Then only the expense total must be visible
And no incoming/expenses/balance rows must be shown
And the comparison row must use expense semantics
```

### Balance visibility on

```
Given that the "Show balance" toggle is on
When the overview is rendered
Then three labeled metric rows must be displayed below the primary value and comparison row:
  - value "revenue"  → label from key "overview.revenue"  (en: "Incoming"  / pt-BR: "Entradas")
  - value "expenses" → label from key "overview.expenses" (en: "Spending"  / pt-BR: "Gastos")
  - value "net"      → label from key "overview.balance"  (en: "Balance"   / pt-BR: "Saldo")
  (Balance = Incoming − Spending, rendered with strong emphasis)
And there is no tab or segmented control to switch between them — all three are always shown together
And the primary value at the top of the card and the comparison row are unaffected by this toggle
  (they always show expenses, per "Comparison semantics" above)
And the toggle state must be persisted to local storage so it is restored on next launch
```

### Last-update label

```
Given that the card header is rendered
When at least one transaction exists (lastUpdatedAt is defined)
Then the header-right text must read the i18next key "overview.lastUpdate" with the {{date}} placeholder
  (en: "Last update: {{date}}" / pt-BR: "Última atualização: {{date}}")
And {{date}} must be produced by the same relative-date formatter used for the Transactions section headers
  (utils/format.ts `formatRelativeDate` — the single source for this formatting, shared with transactions-list.ts)
  - same calendar day as now → label from key "transactions.today" (en: "Today" / pt-BR: "Hoje")
  - exactly the day before now → label from key "transactions.yesterday" (en: "Yesterday" / pt-BR: "Ontem")
  - same year as now (but not today or yesterday) → Intl.DateTimeFormat({ day: "numeric", month: "long" }) in the active language
  - a different year → Intl.DateTimeFormat({ day: "numeric", month: "long", year: "numeric" }) in the active language
And unlike the Transactions section headers, this label must NOT be uppercased (it renders inline, not as a sticky section header)
And the time of day must not be shown — only the relative/calendar date

Given that no transaction exists yet (lastUpdatedAt is undefined)
Then the header-right text must read the i18next key "overview.addFirstTransaction"
  (en: "Add your first transaction" / pt-BR: "Adicione sua primeira transação")
```

### Negative-value tinting

```
Given that a monetary value in the card can go negative (e.g. refunds exceeding spending in the period)
Then the primary value at the top of the card must render with the "negative" tone (red) when it is below zero,
  and the "neutral" tone otherwise
And the "Incoming" metric row must render with the "negative" tone (red) when its value is below zero,
  the "positive" tone (green) when above zero, and no tint at exactly zero
And the "Spending" row is always rendered in the default/neutral tone (no red or green tint, regardless of sign)
And the "Balance" row keeps its existing favorability-based tinting (see "Balance visibility on")
```

### Market-style financial presentation

```
Given that the overview component is rendered in any mode
When monetary values are displayed
Then they must use the PriceText component with appropriate scale (xl for primary, smaller for secondary)
And PriceText must receive the active language as its `locale` prop so the number-formatting separators follow the active language
And the currency code passed in must be the user-selected currency from useCurrency
And changes must always use the directional arrow + percentage pattern (no raw deltas in the foreground)
And tone usage must remain subtle: green/red for outcome, never as decorative emphasis
And the layout must resemble a financial market summary card (label, large value, small comparison line) rather than a budgeting tool
```

### Context-aware comparison logic

```
Given that the overview is rendered
When the comparison delta is computed
Then the previous period must match the same aggregation level as the primary period:
  - month mode → previous month (crossing year boundaries when the selected month is January)
  - year mode → previous year
And the percentage must be the delta divided by the previous-period absolute value
And when the delta is zero (current equals previous), the percentage must be "0%" and rendered with the neutral muted tone
And when the previous-period value is zero AND the current value is non-zero, the percentage must be omitted (only the absolute baseline is shown)
```

### Balance toggle source of truth

```
Given that the "Show balance" toggle exists
When the user wants to flip it
Then the control lives on the Settings tab inside the Display section (not on the Balance screen itself)
And toggling it in Settings must take effect on the Overview without an app restart
  (cross-instance state sync via the persisted-state hook)
And the persisted storage key for this toggle is "dashboard:revenue-visible" (unchanged internal key)
```

### Localization

```
Given that the active language is one of the supported languages
When any overview content is rendered
Then every label must be sourced from i18next using these keys:
  - primary label prefix: "overview.primaryPrefix" (en: "Bills" / pt-BR: "Contas")
  - metric rows:        "overview.revenue" / "overview.expenses" / "overview.balance"
  - mode badges:        "overview.modes.month" / "overview.modes.year" / "overview.modes.all"
  - comparison phrase:  "comparison.moreThan" / "comparison.lessThan" / "comparison.sameAs" (by delta sign) with {{label}}
                        (shared namespace — see "Comparison row format" and category-card.md)
  - last-update label:  "overview.lastUpdate" with {{date}} / "overview.addFirstTransaction"
                        ({{date}} reuses "transactions.today" / "transactions.yesterday" — see "Last-update label")
And every monetary value must be formatted via Intl.NumberFormat using the active language as the locale and the user-selected currency
And percentages must use the active language's decimal separator (en: ".", pt-BR: ",")
And month names in the primaryLabel, comparisonLabel, and timeline labels must be produced by Intl.DateTimeFormat in the active language

Given that the user changes the active language or currency from Settings
When the Overview re-renders
Then every label and number must update in place without an app restart
```

See the [Localization spec](localization.md) for the broader language/currency contract.
