# Component 2 — Overview

The Overview is the primary financial summary card on the dashboard. It reflects the active time-filter scope (month or year) and exposes a per-lens view of expenses, revenue, and net.

## Scenarios

### Monthly overview display

```
Given that the user is logged in
And a specific year and a specific month are selected in the time filter
And the "Ano todo" chip is not selected
When the dashboard overview is rendered
Then it must display the total expenses for the selected month as the primary metric
And it must display the previous month's total expenses as the baseline comparison
And the previous-month comparison must cross the year boundary when the selected month is January
  (e.g. January 2026 compares against December 2025)
And the comparison row must include a directional indicator (arrow + percentage) and the previous-period absolute value
And a "MÊS" badge must be visible in the card header
And all monetary values must use Brazilian Portuguese currency formatting (R$ 1.234,56)
```

### Year overview display

```
Given that a specific year is selected in the time filter
And the "Ano todo" chip is selected
When the dashboard overview is rendered
Then it must display the total expenses for the selected year as the primary metric
And it must display the previous year's total expenses as the baseline comparison
And it must display a horizontal "Todos os meses" timeline below the comparison
And the timeline must list one entry per month with that month's total
And the current month must be visually highlighted in the timeline (only when the selected year is the current year)
And an "ANO" badge must be visible in the card header
```

### Comparison row format

```
Given that an overview comparison is rendered (month or year mode)
When the comparison row is displayed
Then it must contain a directional indicator, a signed percentage, and a baseline phrase
And the baseline phrase must follow the format: vs {label} ({absolute value})
  (e.g. "vs Abril (R$ 4.700,00)" or "vs 2025 (R$ 50.000,00)")
And the absolute delta amount must be hidden — only the percentage is shown next to the indicator
And the indicator's icon and tone must reflect the movement:
  - delta > 0 → up-right arrow, tone reflects the lens-specific favorability (red/green per "Per-lens comparison semantics")
  - delta < 0 → down-right arrow, tone reflects the lens-specific favorability
  - delta = 0 → minus icon, neutral muted tone (textMuted); percentage renders as "0%" with no sign
And signed percentages use "exceptZero" sign display (positives prefixed with "+", negatives with "−", zero rendered bare)
```

### Per-lens comparison semantics

```
Given that the comparison row is rendered
When the active lens is "Despesas"
Then the comparison must compare current expenses to previous-period expenses
And a higher value must be tinted red (lower spending is the favorable outcome)

When the active lens is "Receitas"
Then the comparison must compare current revenue to previous-period revenue
And a higher value must be tinted green (higher revenue is the favorable outcome)

When the active lens is "Saldo"
Then the comparison must compare current net (revenue minus expenses) to previous-period net
And a higher value must be tinted green (higher net is the favorable outcome)

When revenue visibility is disabled, the comparison must always use the "Despesas" semantics.
```

### Revenue visibility off (default)

```
Given that the "Mostrar receitas" toggle is off
When the overview is rendered
Then only expense totals must be visible
And no segmented control or revenue/expense/net rows must be shown
And the comparison row must always use expense semantics
```

### Revenue visibility on

```
Given that the "Mostrar receitas" toggle is on
When the overview is rendered
Then a segmented control with options "Despesas", "Receitas", "Saldo" must be visible
And three labeled metric rows must be displayed below it: Receitas, Despesas, Saldo
  (Saldo = Receitas − Despesas, rendered with strong emphasis)
And switching the segmented control must update both the primary value at the top of the card and the comparison row in real time
And the toggle state must be persisted to local storage so it is restored on next launch
```

### Market-style financial presentation

```
Given that the overview component is rendered in any mode
When monetary values are displayed
Then they must use the PriceText component with appropriate scale (xl for primary, smaller for secondary)
And changes must always use the directional arrow + percentage pattern (no raw deltas in the foreground)
And tone usage must remain subtle: green/red for outcome, never as decorative emphasis
And the layout must resemble a financial market summary card (label, large value, small comparison line) rather than a budgeting tool
And currency formatting must always use the pt-BR locale
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

### Revenue toggle source of truth

```
Given that the "Mostrar receitas" toggle exists
When the user wants to flip it
Then the control lives on the Ajustes tab inside the "Exibição" section (not on the Balanço screen itself)
And toggling it in Ajustes must take effect on the Overview without an app restart
  (cross-instance state sync via the persisted-state hook)
And the persisted storage key for this toggle is "dashboard:revenue-visible"
```

### Localization

```
Given that the app is configured for Brazilian Portuguese
When any overview content is rendered
Then all labels must be in Portuguese:
  - segmented control: "Despesas", "Receitas", "Saldo"
  - metric rows: "Receitas", "Despesas", "Saldo"
  - mode badges: "MÊS", "ANO"
  - timeline header: "TODOS OS MESES"
And currency must be formatted as R$ X.XXX,XX
And percentages must use the Portuguese decimal comma (e.g. "+6,4%")
```
