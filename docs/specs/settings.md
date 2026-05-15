# Component 8 — Settings (Ajustes)

The Ajustes tab is the project's user-preferences surface. It currently exposes a single section ("Exibição") with two persisted toggles that affect what the Balanço screen renders. The screen is designed to grow: more sections will be added over time without altering the section/row primitives.

The "Mostrar receitas" toggle previously lived on the Balanço screen and was relocated here. The "Modo demo" toggle is new and controls whether the dashboard renders a generated demo dataset or the real (currently empty / starter) state.

## Scenarios

### Screen placement and chrome

```
Given that the user is logged in
When the Ajustes tab is selected
Then the screen must render its own scrollable layout (no shared header)
And the page title "Ajustes" must appear at the top using the display text variant, bold weight
And content must scroll independently of the tab bar
And the screen background must use the theme's background color
```

### "Exibição" section structure

```
Given that the Ajustes screen is rendered
When the "Exibição" section is displayed
Then it must use the SettingsSection molecule with title "Exibição"
And the section must render a bordered Surface card containing its rows
And rows must be separated by a horizontal hairline divider, inset 16 points from the left edge
And each row inside the section must use the SettingsRow molecule (title + optional description + trailing slot)
```

### "Mostrar receitas" row

```
Given that the "Exibição" section is rendered
When the "Mostrar receitas" row is displayed
Then it must show the title "Mostrar receitas" (body variant, medium weight)
And it must show the description "Exibe os valores de receita no resumo financeiro." (caption variant, muted tone)
And the trailing slot must contain a Toggle bound to the persisted-state key "dashboard:revenue-visible"
And the default value (when no persisted state exists) must be false
```

### "Modo demo" row

```
Given that the "Exibição" section is rendered
When the "Modo demo" row is displayed
Then it must show the title "Modo demo" (body variant, medium weight)
And it must show the description "Substitui todos os valores reais por dados de exemplo." (caption variant, muted tone)
And the trailing slot must contain a Toggle bound to the persisted-state key "settings:demo-mode"
And the default value (when no persisted state exists) must be false
```

### Persistence

```
Given that the user toggles "Mostrar receitas" or "Modo demo"
When the toggle's new value is committed
Then it must be persisted to local storage immediately (expo-sqlite KV store)

Given that the user kills and relaunches the app
When the Ajustes screen mounts
Then both toggles must restore to the values that were persisted before relaunch
```

### Cross-screen synchronization

```
Given that the Balanço tab and the Ajustes tab are both mounted (native tabs keep tabs alive)
When the user toggles "Mostrar receitas" or "Modo demo" on the Ajustes screen
Then the Balanço screen must reflect the new value without requiring an app restart or tab remount
  (the persisted-state hook broadcasts to all subscribers of the same key)
```

### Demo mode — ON: generated dataset

```
Given that the "Modo demo" toggle is on
When the Balanço screen renders
Then the dashboard data must come from the procedural mock (`generateFinanceMock()`)
And a notice banner must appear between the Overview and the CategoryGrid with:
  - the SF Symbol "sparkles" tinted with the theme's tint color
  - the title "Modo demo ativado" (body variant, semibold)
  - the description "Os valores exibidos são dados de exemplo. Desative em Ajustes." (caption variant, muted)
And the banner must use a muted, bordered Surface
```

### Demo mode — OFF: starter state

```
Given that the "Modo demo" toggle is off
When the Balanço screen renders
Then the dashboard data must come from the starter mock (no transactions, the four seeded categories)
And the four starter categories must be:
  1. Bar / Restaurante (id "bar_restaurante", type expense)
  2. Mercado (id "mercado", type expense)
  3. Farmácia (id "farmacia", type expense)
  4. Viagens (id "viagens", type expense)
And each category card must render with total R$ 0,00 and the empty-card state ("Sem atividade neste período")
```

### Empty-state notice (demo off, no transactions)

```
Given that the "Modo demo" toggle is off
And the dashboard has zero transactions
When the Balanço screen renders
Then a notice banner must appear above the Overview (immediately below the TimeFilterBar) with:
  - the SF Symbol "sparkles" tinted with the theme's tint color
  - the title "Sem dados para exibir" (body variant, semibold)
  - the description "Ative o Modo demo em Ajustes para ver dados de exemplo." (caption variant, muted)
And the banner must use a muted, bordered Surface
And the "Modo demo ativado" banner between Overview and CategoryGrid must NOT appear
```

### Banner exclusivity

```
Given that the Balanço screen renders
When both banner conditions are evaluated
Then the empty-state notice only appears when demo is OFF and there are no transactions
And the "Modo demo ativado" notice only appears when demo is ON
And the two banners must never appear simultaneously
```

### Future sections

```
Given that the Ajustes screen will accept more sections later
When a new section is added
Then it must use the SettingsSection + SettingsRow molecules (no ad-hoc layout)
And the page-level vertical gap between sections must remain 24 points
```

### Localization

```
Given that the app is configured for Brazilian Portuguese
When the Ajustes screen is rendered
Then all labels must be in Portuguese:
  - page title: "Ajustes"
  - section title: "Exibição"
  - rows: "Mostrar receitas" / "Modo demo"
  - row descriptions: as specified above
  - banners: "Modo demo ativado", "Sem dados para exibir"
```
