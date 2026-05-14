# Component 3 — Category Grid

The dashboard's per-category breakdown. Sits below the Overview, shows one card per expense category, with a sort menu and a multi-select filter on top. Income categories are not represented in this grid.

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
  1. "Maior despesa" (default)
  2. "Mais usadas"
  3. "Acima do orçamento"
And the menu trigger must read "Ordenar: <current>" with the active option's label
```

### Sort behavior

```
Given that the sort menu is visible
When the user changes the sort
Then the grid must reorder instantly without page reload

When the active sort is "Maior despesa"
Then categories are ordered by total amount, descending

When the active sort is "Mais usadas"
Then categories are ordered by completed transaction count for the period, descending
And total amount is the tiebreaker, descending

When the active sort is "Acima do orçamento"
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
Then it must display the count: "<n> selecionada(s)"
And it must display the total of the selected categories
And the total must include "por mês" in month mode and "por ano" in year mode
And when both expense and income totals are present, both must be labeled
  (e.g. "2 selecionadas · Despesas R$ X · Receitas R$ Y por mês")
And the summary line must not appear when no filters are active
```

### Empty state

```
Given that filters have removed all categories
When the grid would otherwise be empty
Then an EmptyState block must appear in place of the grid
And it must show the title "Nenhuma categoria"
And it must show the body "Ajuste os filtros para ver suas categorias."
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
Given that the app is configured for Brazilian Portuguese
When the grid is rendered
Then all labels must be in Portuguese:
  - sort trigger: "Ordenar: <option>"
  - sort options: "Maior despesa", "Mais usadas", "Acima do orçamento"
  - filter summary: "selecionada"/"selecionadas", "Despesas", "Receitas", "por mês"/"por ano"
  - empty state: "Nenhuma categoria", "Ajuste os filtros para ver suas categorias."
And currency totals must use the pt-BR locale (R$ X.XXX,XX)
```
