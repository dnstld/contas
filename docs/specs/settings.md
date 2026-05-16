# Component 8 — Settings (Ajustes)

The Settings tab is the project's user-preferences surface. It exposes three sections:

1. **Display** (pt-BR: "Exibição") — two persisted toggles that affect what the Balance screen renders.
2. **Language** (pt-BR: "Idioma") — language picker that drives the i18n layer.
3. **Account** (pt-BR: "Conta") — sign-out action; the user's entry point into the auth surface.

The screen is designed to grow: more sections will be added over time without altering the section/row primitives.

The "Show revenue" toggle previously lived on the Balance screen and was relocated here. The "Demo mode" toggle controls whether the dashboard renders a generated demo dataset or the real per-wallet state from Supabase. The Language row is the public surface of the [Localization](localization.md) feature.

> **Currency note:** currency is per-wallet (`wallets.currency`), not a device preference. The Settings screen currently exposes a Display currency picker as a transitional surface that writes to the active wallet's currency column; a dedicated **Wallet settings** surface is planned for a future iteration and is out of scope here. The associated i18n keys (`settings.sections.regional`, `settings.currencyRow.*`, `settings.currencies.*`) are intentionally retained for the transitional UI.

> Note on language: this spec uses the English copy because English is the default language. Equivalent Portuguese strings are listed alongside where they're material to the contract. The full string contract lives in `i18n/locales/en.json` and `i18n/locales/pt-BR.json`.

## Scenarios

### Screen placement and chrome

```
Given that the user is logged in
When the Settings tab is selected
Then the screen must render its own scrollable layout (no shared header)
And the page title (en: "Settings" / pt-BR: "Ajustes") must appear at the top using the display text variant, bold weight
And the page title must be sourced from i18next (key: "settings.title")
And content must scroll independently of the tab bar
And the screen background must use the theme's background color
```

### Section ordering

```
Given that the Settings screen is rendered
When its sections are displayed top-to-bottom
Then the order must be:
  1. Display (key: "settings.sections.display")
  2. Language (key: "settings.sections.regional" — retained for backwards compatibility while a transitional currency row is present)
  3. Account (key: "settings.sections.account")
And the page-level vertical gap between sections must be 24 points
```

### "Display" section structure

```
Given that the Settings screen is rendered
When the Display section is displayed
Then it must use the SettingsSection molecule with title from key "settings.sections.display"
And the section must render a bordered Surface card containing its rows
And rows must be separated by a horizontal hairline divider, inset 16 points from the left edge
And each row inside the section must use the SettingsRow molecule (title + optional description + trailing slot)
```

### "Show revenue" row

```
Given that the Display section is rendered
When the "Show revenue" row is displayed
Then it must show a title from key "settings.revenueVisible.title" (body variant, medium weight)
  (en: "Show revenue" / pt-BR: "Mostrar receitas")
And it must show a description from key "settings.revenueVisible.description" (caption variant, muted tone)
  (en: "Show revenue values in the financial summary." / pt-BR: "Exibe os valores de receita no resumo financeiro.")
And the trailing slot must contain a Toggle bound to the persisted-state key "dashboard:revenue-visible"
And the default value (when no persisted state exists) must be false
```

### "Demo mode" row

```
Given that the Display section is rendered
When the "Demo mode" row is displayed
Then it must show a title from key "settings.demoMode.title" (body variant, medium weight)
  (en: "Demo mode" / pt-BR: "Modo demo")
And it must show a description from key "settings.demoMode.description" (caption variant, muted tone)
  (en: "Replace all real values with sample data." / pt-BR: "Substitui todos os valores reais por dados de exemplo.")
And the trailing slot must contain a Toggle bound to the persisted-state key "settings:demo-mode"
And the default value (when no persisted state exists) must be false
```

### "Language" section structure

```
Given that the Settings screen is rendered
When the Language section is displayed
Then it must use the SettingsSection molecule with title from key "settings.sections.regional"
  (en: "Language" / pt-BR: "Idioma" — the underlying i18n key is retained while the transitional currency row is present)
And the section must contain the App language row
And during the transitional period the section may additionally contain a Display currency row (see "Transitional currency row" below)
And rows must be separated by a horizontal hairline divider, inset 16 points from the left edge
```

### "App language" row

```
Given that the Language section is rendered
When the language row is displayed
Then the title must come from key "settings.languageRow.title"
  (en: "App language" / pt-BR: "Idioma do app")
And the row must have no description
And the trailing slot must contain a SortMenu picker:
  - on iOS: a SwiftUI Menu wrapping a Picker
  - on Android: a Compose DropdownMenu triggered by a pressable pill
And the picker must NOT prepend any "Language: " prefix; only the active option's label must be shown
And the available options must be, in this order:
  1. "English" (en: "English" / pt-BR: "Inglês") — value "en"
  2. "Portuguese (Brazil)" (en: "Portuguese (Brazil)" / pt-BR: "Português (Brasil)") — value "pt-BR"
And selecting an option must call i18n.changeLanguage(value) and persist under "settings:language"
```

### Transitional "Display currency" row

```
Given that the Wallet settings surface has not yet been implemented
When the Language section is rendered
Then the section may include a Display currency row whose trailing slot is a SortMenu picker
And the title must come from key "settings.currencyRow.title"
  (en: "Display currency" / pt-BR: "Moeda de exibição")
And the row must have no description
And the available options must be, in this order:
  1. value "BRL" — en: "Brazilian Real (R$)" / pt-BR: "Real (R$)"
  2. value "USD" — en: "US Dollar ($)" / pt-BR: "Dólar (US$)"
  3. value "EUR" — en: "Euro (€)" / pt-BR: "Euro (€)"
And selecting an option must update the active wallet's currency column (wallets.currency) via Supabase
And NO value must be written to a "settings:currency" persisted-state key (the key is retired)
And on success every monetary amount on screen must reformat (via the wallet context update + TanStack Query cache)
And when the Wallet settings surface lands, this row must be moved there and removed from the Settings screen
```

### Persistence

```
Given that the user toggles any toggle or picks a new value on this screen
When the change is committed
Then any device-scoped preference must be persisted to local storage immediately (expo-sqlite KV store)
And the storage keys owned by this screen are:
  - "dashboard:revenue-visible"   (boolean)
  - "settings:demo-mode"          (boolean)
  - "settings:language"           (supported language code: "en" or "pt-BR")
And currency selections from the transitional Display currency row must NOT be persisted to kv-store;
  they are written to the database (wallets.currency) and propagate via the wallet context

Given that the user kills and relaunches the app
When the Settings screen mounts
Then every toggle and the language picker must restore to the values persisted before relaunch
And there must be no visible "wrong default first, then correct value" flash for language
  (i18n bootstrap awaits the language read before the root layout renders)
And the currency picker must restore to the wallet's currency once the wallet context resolves
```

### Cross-screen synchronization

```
Given that the Balance tab and the Settings tab are both mounted (native tabs keep tabs alive)
When the user changes any persisted preference on the Settings screen
Then the Balance screen must reflect the new value without requiring an app restart or tab remount
  (the persisted-state hook broadcasts to all subscribers of the same key)
And when the language changes, every translatable string and every locale-formatted value (currency, number, month name) must update on every visible screen

Given that the user changes the wallet's currency from the transitional Display currency row
When the update completes
Then every monetary amount on every visible screen must reformat to the new currency on next render
  (consistency is achieved via the wallet context update + TanStack Query cache, NOT via persisted-state broadcast)
And no language-level text must change
```

### Demo mode — ON: generated dataset

```
Given that the "Demo mode" toggle is on
When the Balance screen renders
Then the dashboard data must come from the procedural mock (`generateFinanceMock()`)
And a notice banner must appear between the Overview and the CategoryGrid with:
  - the SF Symbol "sparkles" tinted with the theme's tint color
  - the title from key "balance.demoBadge.title" (body variant, semibold)
    (en: "Demo mode on" / pt-BR: "Modo demo ativado")
  - the description from key "balance.demoBadge.body" (caption variant, muted)
    (en: "Displayed values are sample data. Disable in Settings." / pt-BR: "Os valores exibidos são dados de exemplo. Desative em Ajustes.")
And the banner must use a muted, bordered Surface
```

### Demo mode — OFF: live wallet state

```
Given that the "Demo mode" toggle is off
When the Balance screen renders
Then the dashboard data must come from the active wallet via Supabase (categories + transactions queries scoped to wallets.id)
And during the initial fetch the dashboard must render its loading state (no transactions, no placeholder categories)
And on a brand-new wallet the seeded category from the wallets_after_insert trigger (currently "Bar / Café", type expense) must render with total 0 and the empty-card state from key "category.noActivity"
  (Category names are user-editable data stored in the categories table and remain in their stored form regardless of the active language.)
> Pre-existing drift: an earlier draft of this section listed four starter categories. The DB trigger today seeds only one. Reconciling that mismatch is tracked separately.
```

### Empty-state notice (demo off, no transactions)

```
Given that the "Demo mode" toggle is off
And the dashboard has zero transactions
When the Balance screen renders
Then a notice banner must appear above the Overview (immediately below the TimeFilterBar) with:
  - the SF Symbol "sparkles" tinted with the theme's tint color
  - the title from key "balance.empty.title" (body variant, semibold)
    (en: "No data to display" / pt-BR: "Sem dados para exibir")
  - the description from key "balance.empty.body" (caption variant, muted)
    (en: "Enable Demo Mode in Settings to see sample data." / pt-BR: "Ative o Modo demo em Ajustes para ver dados de exemplo.")
And the banner must use a muted, bordered Surface
And the "Demo mode on" banner between Overview and CategoryGrid must NOT appear
```

### Banner exclusivity

```
Given that the Balance screen renders
When both banner conditions are evaluated
Then the empty-state notice only appears when demo is OFF and there are no transactions
And the "Demo mode on" notice only appears when demo is ON
And the two banners must never appear simultaneously
```

### "Account" section structure

```
Given that the Settings screen is rendered
When the Account section is displayed
Then it must use the SettingsSection molecule with title from key "settings.sections.account"
  (en: "Account" / pt-BR: "Conta")
And the section must contain exactly one row: the Sign out row
And the section must render below the "Language" section, separated by the standard 24-point gap
```

### "Sign out" row

```
Given that the Account section is rendered
When the Sign out row is displayed
Then it must show a title from key "settings.signOutRow.title"
  (en: "Sign out" / pt-BR: "Sair")
And it must show a description from key "settings.signOutRow.description"
  (en: "End your session on this device." / pt-BR: "Encerra sua sessão neste dispositivo.")
And the trailing slot must contain a Button (design-system atom) with:
  - label from key "auth.signOut" (en: "Sign out" / pt-BR: "Sair")
  - variant="destructive"
  - size="small"
And tapping the Button must call useAuth().signOut()
And after sign-out completes, the root layout's route gate must redirect the user to /authentication
  (see the Authentication spec for the gate behavior)
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
Given that the active language is one of the supported languages ("en" or "pt-BR")
When the Settings screen and its companion banners (on the Balance screen) are rendered
Then every label and description must come from i18next under the keys listed in the row scenarios above
And no string must be hardcoded in the screen source
And switching the language from the Settings → Language row must update every label on the screen in place, without a remount or restart
And the section order (Display → Language → Account) must remain consistent across languages
```

See the [Localization spec](localization.md) for the complete contract on language resolution, persistence, and cross-screen synchronization. See the [Data model spec](data-model.md) for the wallet currency contract.
