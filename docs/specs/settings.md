# Component 8 — Account (Conta)

The Account tab is the project's user-identity and preferences surface. It exposes:

1. **Profile card** — avatar, display name, email, and two inline actions: edit name and sign out.
2. **Display** (pt-BR: "Exibição") — two persisted toggles that affect what the Status screen renders.
3. **Language & currency** (pt-BR: "Idioma e moeda") — language picker and transitional currency picker.

The screen has no page-level title; the profile card at the top provides the contextual heading.

The "Show revenue" toggle previously lived on the Status screen and was relocated here. The "Demo mode" toggle controls whether the dashboard renders a generated demo dataset or the real per-wallet state from Supabase. The Language row is the public surface of the [Localization](localization.md) feature.

> **Currency note:** currency is per-wallet (`wallets.currency`), not a device preference. The Settings screen currently exposes a Display currency picker as a transitional surface that writes to the active wallet's currency column; a dedicated **Wallet settings** surface is planned for a future iteration and is out of scope here.

> Note on language: this spec uses the English copy because English is the default language. Equivalent Portuguese strings are listed alongside where they're material to the contract. The full string contract lives in `i18n/locales/en.json` and `i18n/locales/pt-BR.json`.

## Scenarios

### Screen placement and chrome

```
Given that the user is logged in
When the Account tab is selected
Then the screen must render its own scrollable layout (no shared header)
And there must be no page-level title text at the top of the scroll content
And content must scroll independently of the tab bar
And the screen background must use the theme's background color
```

### Section ordering

```
Given that the Account screen is rendered
When its sections are displayed top-to-bottom
Then the order must be:
  1. Profile card (no section wrapper)
  2. Display (key: "settings.sections.display")
  3. Language & currency (key: "settings.sections.regional")
And the page-level vertical gap between elements must be 24 points
```

### Profile card

```
Given that the Account screen is rendered
When the profile card is displayed
Then it must render as a muted Surface with 16-point padding and 16-point corner radius
And it must contain two rows:
  Row 1 — identity row (horizontal, items centered, 14-point gap):
    - Avatar (44×44, borderRadius 22):
        If the session provides user_metadata.avatar_url:
          render an expo-image <Image> with the URL
        Else:
          render a muted elevated Surface containing the user's initials (first + last word initials, uppercase, max 2 chars)
    - Name/email column (flex: 1):
        Primary text: user_metadata.full_name if present, otherwise the user's email (subtitle variant, semibold)
        Secondary text: the user's email (caption variant, muted tone) — only shown when full_name is also present
  Row 2 — actions row (horizontal, 10-point gap):
    - "Edit" button (flex: 1, pill, hairline border in theme border color, caption variant, medium weight, muted text color)
      (key: "profile.actions.editName" — en: "Edit" / pt-BR: "Editar")
    - "Sign out" button (flex: 1, pill, hairline border in theme negative color, caption variant, medium weight, negative/red text color)
      (key: "profile.actions.signOut" — en: "Sign out" / pt-BR: "Sair")
And all identity data must come from useAuth().session.user (no separate DB query)
```

### Profile card — "Edit" action

```
Given that the profile card is rendered
When the user taps the "Edit" button
Then the EditDisplayNameModal must become visible
And the modal's text input must be pre-filled with the user's current full_name (or empty if none)
And the input must auto-focus so the keyboard appears immediately
```

### Edit display name modal

```
Given that the EditDisplayNameModal is visible
When the modal is displayed
Then it must render as a bottom sheet (same structure as CategoryFormModal):
  - transparent full-screen Modal with fade animation
  - semi-transparent backdrop (rgba 0,0,0,0.4) that dismisses on tap
  - sheet anchored to the bottom with top-left and top-right radius of 20
  - title centered: key "profile.editName.title" (subtitle variant, semibold)
    (en: "Edit name" / pt-BR: "Editar nome")
  - label above the input: key "profile.editName.nameLabel" uppercased, letter-spacing 0.8
    (en: "Name" / pt-BR: "Nome")
  - TextInput pre-filled with the current name, maxLength 80, returnKeyType "done"
    placeholder from key "profile.editName.namePlaceholder"
    (en: "Your name" / pt-BR: "Seu nome")
  - two action buttons (row, 12-point gap):
      Cancel (flex: 1, pill, hairline border): key "profile.editName.cancel" (en: "Cancel" / pt-BR: "Cancelar")
      Save   (flex: 1, pill, positive/green background, white label):
        idle:    key "profile.editName.save"   (en: "Save"    / pt-BR: "Salvar")
        pending: key "profile.editName.saving" (en: "Saving…" / pt-BR: "Salvando…")

Given that the user types a non-empty name and taps Save (or submits via keyboard)
When the save action runs
Then it must call supabase.auth.updateUser({ data: { full_name: trimmedName } })
And while the call is in flight the Save button must show the "Saving…" label and be non-interactive
And on success the modal must close
And the profile card's displayed name must update immediately (session refresh via onAuthStateChange)

Given that the name field is empty
When the Save button is evaluated
Then it must be visually dimmed (opacity 0.4) and must not submit

Given that the user taps the backdrop or the Cancel button
When the modal closes
Then no change must be persisted
```

### Profile card — "Sign out" action

```
Given that the profile card is rendered
When the user taps the "Sign out" button
Then useAuth().signOut() must be called
And after sign-out completes, the root layout's route gate must redirect the user to /authentication
  (see the Authentication spec for the gate behavior)
```

### "Display" section structure

```
Given that the Account screen is rendered
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

### "Language & currency" section structure

```
Given that the Account screen is rendered
When the Language & currency section is displayed
Then it must use the SettingsSection molecule with title from key "settings.sections.regional"
  (en: "Language" / pt-BR: "Idioma e moeda")
And the section must contain the Language row and the transitional Currency row
And rows must be separated by a horizontal hairline divider, inset 16 points from the left edge
```

### "Language" row

```
Given that the Language & currency section is rendered
When the language row is displayed
Then the title must come from key "settings.languageRow.title"
  (en: "Language" / pt-BR: "Idioma")
And the row must have no description
And the trailing slot must contain a SortMenu picker:
  - on iOS: a SwiftUI Menu wrapping a Picker
  - on Android: a Compose DropdownMenu triggered by a pressable pill
And the picker must NOT prepend any prefix; only the active option's label must be shown
And the available options must be, in this order:
  1. "English" (en: "English" / pt-BR: "Inglês") — value "en"
  2. "Portuguese (Brazil)" (en: "Portuguese (Brazil)" / pt-BR: "Português (Brasil)") — value "pt-BR"
And selecting an option must call i18n.changeLanguage(value) and persist under "settings:language"
```

### Transitional "Currency" row

```
Given that the Wallet settings surface has not yet been implemented
When the Language & currency section is rendered
Then the section must include a Currency row whose trailing slot is a SortMenu picker
And the title must come from key "settings.currencyRow.title"
  (en: "Currency" / pt-BR: "Moeda")
And the row must have no description
And the available options must be, in this order:
  1. value "BRL" — en: "Brazilian Real (R$)" / pt-BR: "Real (R$)"
  2. value "USD" — en: "US Dollar ($)" / pt-BR: "Dólar (US$)"
  3. value "EUR" — en: "Euro (€)" / pt-BR: "Euro (€)"
And selecting an option must update the active wallet's currency column (wallets.currency) via Supabase
And NO value must be written to a "settings:currency" persisted-state key (the key is retired)
And on success every monetary amount on screen must reformat (via the wallet context update + TanStack Query cache)
And when the Wallet settings surface lands, this row must be moved there and removed from the Account screen
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
And currency selections from the transitional Currency row must NOT be persisted to kv-store;
  they are written to the database (wallets.currency) and propagate via the wallet context

Given that the user kills and relaunches the app
When the Account screen mounts
Then every toggle and the language picker must restore to the values persisted before relaunch
And there must be no visible "wrong default first, then correct value" flash for language
  (i18n bootstrap awaits the language read before the root layout renders)
And the currency picker must restore to the wallet's currency once the wallet context resolves
```

### Cross-screen synchronization

```
Given that the Status tab and the Account tab are both mounted (native tabs keep tabs alive)
When the user changes any persisted preference on the Account screen
Then the Status screen must reflect the new value without requiring an app restart or tab remount
  (the persisted-state hook broadcasts to all subscribers of the same key)
And when the language changes, every translatable string and every locale-formatted value must update on every visible screen

Given that the user changes the wallet's currency from the transitional Currency row
When the update completes
Then every monetary amount on every visible screen must reformat to the new currency on next render
  (consistency is achieved via the wallet context update + TanStack Query cache, NOT via persisted-state broadcast)
```

### Demo mode — ON: generated dataset

```
Given that the "Demo mode" toggle is on
When the Status screen renders
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
When the Status screen renders
Then the dashboard data must come from the active wallet via Supabase (categories + transactions queries scoped to wallets.id)
And during the initial fetch the dashboard must render its loading state (no transactions, no placeholder categories)
And on a brand-new wallet the seeded category from the wallets_after_insert trigger must render with total 0 and the empty-card state
```

### Empty-state notice (demo off, no transactions)

```
Given that the "Demo mode" toggle is off
And the dashboard has zero transactions
When the Status screen renders
Then a notice banner must appear above the Overview with:
  - the SF Symbol "sparkles" tinted with the theme's tint color
  - the title from key "balance.empty.title" (en: "No data to display" / pt-BR: "Sem dados para exibir")
  - the description from key "balance.empty.body" (caption variant, muted)
And the banner must use a muted, bordered Surface
And the "Demo mode on" banner between Overview and CategoryGrid must NOT appear
```

### Future sections

```
Given that the Account screen will accept more sections later
When a new section is added
Then it must use the SettingsSection + SettingsRow molecules (no ad-hoc layout)
And the page-level vertical gap between sections must remain 24 points
```

### Localization

```
Given that the active language is one of the supported languages ("en" or "pt-BR")
When the Account screen is rendered
Then every label and description must come from i18next under the keys listed in the scenarios above
And no string must be hardcoded in the screen source
And switching the language from the Language row must update every label on the screen in place, without a remount or restart
And the section order (Profile card → Display → Language & currency) must remain consistent across languages
```

See the [Localization spec](localization.md) for the complete contract on language resolution, persistence, and cross-screen synchronization. See the [Data model spec](data-model.md) for the wallet currency contract.
