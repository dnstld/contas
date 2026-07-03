# Component 4 — Category Card

A single tile inside the Category Grid. Tap opens the category detail screen; long-press opens the edit modal (see "Interaction" below). Designed to be readable in a 2-column layout on phone widths.

All labels are sourced from i18next; monetary values use the user-selected currency formatted with the active language. See the [Localization spec](localization.md) for the full contract.

## Scenarios

### Visual hierarchy

```
Given that a category card is rendered
When the user views the card
Then the layout follows this vertical order:
  1. Header row: category name (left, bold body) and an optional badge (right, e.g. "Example")
     — no percentage-of-total is shown here
  2. Total amount (large price), with the monthly goal caption (e.g. "of 500,00") beside it when a budget is set
  3. Comparison row (arrow + percentage + previous-period reference)
  4. Transaction count caption
And the category name uses primary text emphasis
And the total uses the largest visual weight on the card
And all secondary information (goal caption, comparison, count) uses caption-sized text
And the card has no icon/avatar
```

### Total and budget-aware tone

```
Given that the card displays the category total
When a monthly budget is defined
Then the total's color and the goal caption's color both follow the same tone:
  - green ("positive") when spend is below the goal
  - amber ("warning") when spend is exactly at the goal
  - red ("negative") when spend exceeds the goal
And both render in the muted/neutral tone when no budget is defined
And the goal caption text comes from key "category.goalOf" with the {{value}} placeholder
  (e.g. en: "of 500.00" / pt-BR: "de 500,00" — the value is a plain formatted number, not currency)
And there is no percentage-of-total badge and no progress meter on the card — only the total's/caption's color and the caption text communicate goal status
```

### Comparison row

```
Given that the card has previous-period data (delta and a previous-period label are both defined) and isn't empty
When the comparison row renders
Then it must be rendered by the shared `ComparisonLine` molecule (components/ui/molecules/comparison-line.tsx) —
  the same component used below the Balance card's total, so both surfaces stay in sync (see overview.md)
And it must show, in order: a directional icon, the absolute delta amount (when nonzero), and a trailing phrase
And there is no percentage anywhere in this row
And the delta amount is formatted as currency via Intl.NumberFormat using the active language as the locale
  and the user-selected currency (e.g. en + USD: "$4,700.00" / pt-BR + BRL: "R$ 4.700,00")
  — this is the previous-vs-current difference, not the previous period's absolute total
And the trailing phrase comes from one of three i18next keys under the shared "comparison" namespace, by delta sign:
  - delta > 0 → "comparison.moreThan" (en: "more than {{label}}" / pt-BR: "mais que {{label}}")
  - delta < 0 → "comparison.lessThan" (en: "less than {{label}}" / pt-BR: "menos que {{label}}")
  - delta = 0 → "comparison.sameAs"   (en: "same as {{label}}" / pt-BR: "igual a {{label}}") — no amount shown for this case
  (e.g. en + USD, delta < 0: "↘ $310.00 less than April")
And {{label}} in month mode must be the previous month's name produced by Intl.DateTimeFormat in the active language
And {{label}} in year mode must be the previous year as a 4-digit string
And the icon and tone must reflect the movement:
  - delta > 0 → up-right arrow, red tone for expense categories (more spending is unfavorable),
    green tone for income categories (more income is favorable)
  - delta < 0 → down-right arrow, the opposite tone of the delta > 0 case
  - delta = 0 → minus icon, neutral muted tone (textMuted)
And the amount (when shown) is colored the same as the icon; the trailing phrase is always muted text
  (`lowerIsBetter` is true for expense categories, false for income categories)
```

### Transaction count

```
Given that the category has at least one completed transaction in the period
When the count caption is rendered
Then it must come from the i18next key "category.transactionCount" with the {{count}} placeholder
And i18next must apply the active language's plural rule:
  - en: "1 transaction" (count=1) / "<n> transactions" (count≠1)
  - pt-BR: "1 transação" (count=1) / "<n> transações" (count≠1)
And the caption must use the muted secondary tone
And it must sit below the comparison row
```

### Empty card state

```
Given that the category has zero activity in the period
When the card is rendered
Then the comparison row and transaction count must be omitted
And the empty line must come from the i18next key "category.noActivity"
  (en: "No activity in this period" / pt-BR: "Sem atividade neste período")
And the header (name) and total (formatted in the active currency, e.g. "R$ 0,00" / "$0.00" / "€0.00") must remain visible
And the card must preserve the same overall structure to keep the grid visually balanced
```

### Layout robustness

```
Given that the category name or comparison row is wider than the card
When the card is rendered in a 2-column layout
Then the name must truncate to a single line with an ellipsis
And the comparison row must fit without forcing the card to grow disproportionately
And no element must be clipped beyond its containing card
```

### Interaction

```
Given that a category card is rendered inside the dashboard grid
When the user taps it
Then it must navigate to that category's detail screen, carrying the active time filter
When the user long-presses it
Then it must open the edit-category modal for that category
And the card itself renders no visible affordance for either gesture — the whole card is the hit target
```

### Localization

```
Given that the active language is one of the supported languages
When the card is rendered
Then every label must be sourced from i18next using these keys:
  - goal caption:        "category.goalOf" with {{value}} (plain formatted number, not currency)
  - comparison phrase:  "comparison.moreThan" / "comparison.lessThan" / "comparison.sameAs" (by delta sign) with {{label}}
                        (shared namespace — see "Comparison row" above and overview.md)
  - transaction count:  "category.transactionCount" with {{count}} (uses i18next plural rules per language)
  - empty state:        "category.noActivity"
And the previous-period {{label}} in month mode must be the previous month's name produced by Intl.DateTimeFormat in the active language
And the total at the top of the card must be formatted as a currency using the active language and the user-selected currency
  (e.g. en + USD: "$1,234.56"; pt-BR + BRL: "R$ 1.234,56"; pt-BR + EUR: "€ 1.234,56")
And the card shows no percentages anywhere — only the goal caption (plain number) and the comparison amount (currency)
And the category name itself comes from stored data and is not translated
```

See the [Localization spec](localization.md) for the broader language/currency contract.
