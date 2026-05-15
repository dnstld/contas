# Component 3 — Category Grid

The dashboard's per-category breakdown. Sits below the Overview, shows one card per expense category, with a sort menu and a multi-select filter on top. Income categories are not represented in this grid.

All labels are sourced from i18next; monetary values use the user-selected currency formatted with the active language. See the [Localization spec](localization.md) for the full contract.

## Scenarios

### Grid display

```
Given that the user is logged in
And the dashboard has finished loading
When the category grid section is rendered
Then it must appear below the Overview section
And it must show only expense categories (income categories are filtered out)
And cards must be displayed in a 2-column grid layout
And each card must show that category's total for the active period
And each card must show that category's share of total expenses for the period
And spacing between cards must be uniform; cards must adapt height to content but remain visually balanced
And the grid must scroll vertically and continuously inside the screen's main scroll view
```

### Sort menu

```
Given that the category grid is rendered
When the sort menu is displayed
Then it must offer exactly these three options, in this order:
  1. value "highestExpense" — label from key "category.sort.highestExpense" (default)
     (en: "Highest expense" / pt-BR: "Maior despesa")
  2. value "mostUsed"       — label from key "category.sort.mostUsed"
     (en: "Most used"       / pt-BR: "Mais usadas")
  3. value "overBudget"     — label from key "category.sort.overBudget"
     (en: "Over budget"     / pt-BR: "Acima do orçamento")
And the menu trigger must read "<sort label>: <current>" with:
  - the leading sort label from key "category.sort.label" (en: "Sort" / pt-BR: "Ordenar")
  - the active option's translated label
  (The leading label is explicitly opted into for this picker; other picker uses — such as Settings → Language & Currency — render only the current value.)
```

### Sort behavior

```
Given that the sort menu is visible
When the user changes the sort
Then the grid must reorder instantly without page reload

When the active sort is "highestExpense"
Then categories are ordered by total amount, descending

When the active sort is "mostUsed"
Then categories are ordered by completed transaction count for the period, descending
And total amount is the tiebreaker, descending

When the active sort is "overBudget"
Then categories are ordered by spent/budget ratio, descending
And categories without a defined budget must sink to the bottom of the list
```

### Category filter (multi-select chips)

```
Given that the category grid is rendered
When the filter chip row is displayed
Then it must list one chip per expense category
And chips must be multi-selectable
And selecting one or more chips must filter the grid to only those categories
And deselecting all chips must restore the full category list
```

### Filter summary line

```
Given that one or more category filters are active
When the summary line is rendered between the filter chips and the grid
Then it must display the count from key "category.selectedCount" with the {{count}} placeholder
  (en: "1 selected" / "<n> selected"; pt-BR: "1 selecionada" / "<n> selecionadas" — i18next applies the active language's plural rule)
And it must display the total of the selected categories, formatted in the user-selected currency with the active language
And when both expense and income totals are present, both must be labeled using the i18next keys "overview.expenses" and "overview.revenue"
  (e.g. en + BRL: "2 selected · Expenses R$2,000.00 · Revenue R$5,000.00 per month")
  (e.g. pt-BR + BRL: "2 selecionadas · Despesas R$ 2.000,00 · Receitas R$ 5.000,00 por mês")
And the period suffix must come from i18next:
  - month mode → " " + key "category.perMonth" (en: "per month" / pt-BR: "por mês")
  - year mode  → " " + key "category.perYear"  (en: "per year"  / pt-BR: "por ano")
And the suffix must only appear when the line contains more than the count (i.e. when at least one total is present)
And the summary line must not appear when no filters are active
```

### Empty state

```
Given that filters have removed all categories
When the grid would otherwise be empty
Then an EmptyState block must appear in place of the grid
And the title must come from key "category.empty.title"
  (en: "No categories" / pt-BR: "Nenhuma categoria")
And the body must come from key "category.empty.body"
  (en: "Adjust the filters to see your categories." / pt-BR: "Ajuste os filtros para ver suas categorias.")
```

### Mode-aware behavior

```
Given that the time filter is in month mode (year + specific month)
When the grid renders
Then each card's total reflects the selected month
And the share % is computed against that month's total expenses
And budget-related styling on each card uses the category's monthly budget

Given that the time filter is in year mode ("Ano todo")
When the grid renders
Then each card's total reflects the entire selected year
And the share % is computed against that year's total expenses
And budget-related styling on each card is omitted (monthly budget does not translate to a year scope)
```

### Localization

```
Given that the active language is one of the supported languages
When the grid is rendered
Then every label must be sourced from i18next using these keys:
  - sort trigger leading label: "category.sort.label"
  - sort options:               "category.sort.highestExpense" / "category.sort.mostUsed" / "category.sort.overBudget"
  - filter summary count:       "category.selectedCount" with {{count}} (uses plural rules)
  - filter summary totals:      "overview.expenses" / "overview.revenue"
  - filter summary period:      "category.perMonth" / "category.perYear"
  - empty state:                "category.empty.title" + "category.empty.body"
And every currency total must be formatted via Intl.NumberFormat using the active language as the locale and the user-selected currency
And when the user changes the active language or currency from Settings, the grid must re-render in place with the new strings/values
```

See the [Localization spec](localization.md) for the broader language/currency contract.
