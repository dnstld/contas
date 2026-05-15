# Component 9 — Localization (Language & Currency)

The app supports two independent user preferences that together define how text and money are presented:

- **Language** — drives every translatable label, plural form, and locale-aware date/number formatting. Supported values: `en` (default) and `pt-BR`.
- **Currency** — drives the formatting of all monetary amounts displayed on screen (does not convert between currencies — only changes the symbol and number-formatting rules). Supported values: `BRL`, `USD`, `EUR`.

The two preferences are decoupled: a user can run the UI in English while displaying amounts in BRL, or in Portuguese while displaying amounts in EUR.

Implementation stack:
- `i18next` + `react-i18next` for translation, interpolation, and locale-aware plural rules.
- `expo-localization` for reading the device's preferred language tag on first launch.
- `Intl.NumberFormat` and `Intl.DateTimeFormat` for currency, number, and month-name formatting.
- The existing `usePersistedState` hook backed by `expo-sqlite/kv-store` for persistence.

## Scenarios

### Supported languages

```
Given that the app is running
When the language preference is read or set
Then the only accepted values must be:
  - "en" (English, default)
  - "pt-BR" (Brazilian Portuguese)
And any unsupported or malformed stored value must be ignored and replaced by the resolved default
```

### Supported currencies

```
Given that the app is running
When the currency preference is read or set
Then the only accepted values must be:
  - "BRL" (Brazilian Real, formatted as R$ 1.234,56 in pt-BR / R$1,234.56 in en)
  - "USD" (US Dollar, formatted as $1,234.56 in en / US$ 1.234,56 in pt-BR)
  - "EUR" (Euro, formatted as €1,234.56 in en / € 1.234,56 in pt-BR)
And the displayed grouping/decimal separators must follow the active language, not the currency
  (Intl.NumberFormat is invoked with the active language as the locale and the chosen currency code)
```

### Initial language resolution

```
Given that the app launches and i18n has not been initialized yet
When initI18n runs
Then it must resolve the initial language using this priority chain:
  1. The value previously persisted under the key "settings:language", if it is one of the supported languages
  2. The device language tag returned by expo-localization (full tag match — e.g. "pt-BR")
  3. The device language prefix match (e.g. device "pt-PT" → "pt-BR" via the "pt" prefix)
  4. The default language "en"
And the resolved language must be applied to i18next before the root layout renders
And no screen must render in a transitional / wrong language before initialization completes
  (the root layout returns null until initI18n resolves)
```

### Initial currency resolution

```
Given that the app launches and the currency cell is being pre-warmed inside initI18n
When the cell is loaded from kv-store
Then if a value is stored under "settings:currency" and it is supported, it must be used as-is
And if no value is stored, the device-derived default must be used:
  - device language tag starts with "pt" (any region) → "BRL"
  - any other device language (or no detectable device language) → "EUR"
And "USD" must never be selected as the device-default — it is only available via explicit user choice
And the device-derived default must be computed once per session and cached in memory
```

### Native module unavailable (dev client not rebuilt)

```
Given that the dev client has not been rebuilt after installing expo-localization
And the native module "ExpoLocalization" is not registered in globalThis.expo.modules
When initI18n calls getDeviceLanguageTag()
Then the helper must return null without throwing and without producing a LogBox error
  (the registry is probed before requiring the JS wrapper)
And the language resolver must fall back to "en"
And the currency resolver must fall back to "EUR"
And the app must still boot and render in English
And the user must still be able to override language and currency from the Settings screen
```

### Persistence — language

```
Given that the user picks a language from the Settings screen
When the new value is committed
Then it must be applied to i18next immediately (i18n.changeLanguage)
And the entire UI must re-render in the new language without an app restart
And the new value must be persisted to kv-store under the key "settings:language"

Given that the user kills and relaunches the app
When initI18n runs again
Then the persisted language must be restored before the root layout renders
And there must be no visible flash of the previous or default language
```

### Persistence — currency

```
Given that the user picks a currency from the Settings screen
When the new value is committed
Then every monetary amount on screen must reformat instantly to the new currency
And the new value must be persisted to kv-store under the key "settings:currency"

Given that the user kills and relaunches the app
When initI18n runs
Then it must pre-warm the currency cell (prewarmPersistedState) in parallel with the language read
And the persisted currency must be available to the first render of every consumer of useCurrency
And there must be no flash of the device-derived default before the stored value takes effect
```

### Language and currency are independent

```
Given that the user has selected a language and a currency
When either preference changes
Then changing the language must NOT alter the currency
And changing the currency must NOT alter the language
And the currency symbol always reflects the user's currency choice
And the number-formatting separators always reflect the user's language choice
  (e.g. language="en" + currency="BRL" → "R$1,234.56")
  (e.g. language="pt-BR" + currency="USD" → "US$ 1.234,56")
```

### Currency does not convert amounts

```
Given that the user changes the currency setting
When the dashboard re-renders
Then the underlying numeric amounts must remain unchanged
And only the currency symbol and number-formatting rules must change
And no exchange-rate lookup, conversion, or rounding adjustment must occur
  (e.g. an amount stored as 100 will render as R$ 100,00 or $100.00 or €100.00 depending on the chosen currency)
```

### Translation completeness

```
Given that the app is running in any supported language
When any user-facing string is rendered
Then it must be served via i18next's t(...) function and resolve to a non-empty string
And there must be no untranslated key fallback visible (no raw keys like "category.transactionCount" reaching the screen)
And the fallbackLng must be "en" so any missing key in pt-BR still renders the English copy
And dev-only screens (__DEV__: ui-demo, explore) are explicitly out of scope and may remain in English
```

### Pluralization rules

```
Given that a translation key uses i18next's plural suffix convention (_one / _other)
When the t(...) call passes a `count` argument
Then i18next must apply the active language's plural rule and choose the correct form
And in pt-BR, the "_one" form must be used for count = 1 and "_other" for count ≠ 1
And in en, the "_one" form must be used for count = 1 and "_other" for count ≠ 1
Currently parameterized keys:
  - category.transactionCount (e.g. "1 transação" / "2 transações" / "1 transaction" / "2 transactions")
  - category.selectedCount (e.g. "1 selecionada" / "2 selecionadas" / "1 selected" / "2 selected")
```

### Interpolation rules

```
Given that a translation key uses i18next interpolation ({{name}})
When the t(...) call passes the matching named argument
Then the placeholder must be replaced verbatim with the argument value
And no HTML/JSX escaping must be applied (escapeValue: false)
Currently interpolated keys:
  - category.vsPrevious — {{label}}, {{value}}
  - overview.vsPrevious — {{label}}, {{value}}
```

### Month names follow the active language

```
Given that month names are rendered anywhere in the app
When the renderer needs a month label
Then it must be produced by Intl.DateTimeFormat using the active language as the locale
And no hardcoded Portuguese (or English) month-name array must be consulted
And in pt-BR: "Janeiro", "Fevereiro", … (style "long") or "jan.", "fev.", … (style "short")
And in en: "January", "February", … (style "long") or "Jan", "Feb", … (style "short")
Affected surfaces:
  - TimeFilterBar (long-form month chips)
  - MonthlyTimeline (short-form month labels)
  - Overview primaryLabel and comparisonLabel (e.g. "Maio 2026" / "May 2026")
  - CategoryCard previousLabel for month mode
```

### Currency picker — Settings UI

```
Given that the Ajustes (Settings) screen is rendered
When the user views the "Language & Currency" / "Idioma e moeda" section
Then the section must contain two rows:
  1. The language row (title: "App language" / "Idioma do app")
  2. The currency row (title: "Display currency" / "Moeda de exibição")
And each row's trailing slot must render a SortMenu (SwiftUI Picker on iOS, Compose DropdownMenu on Android)
And the menu trigger must show only the current selection's label (no "Language: " or "Currency: " prefix)
And the currency labels must read:
  - en:  "Brazilian Real (R$)", "US Dollar ($)", "Euro (€)"
  - pt-BR: "Real (R$)", "Dólar (US$)", "Euro (€)"
And the language labels must read:
  - en:  "English", "Portuguese (Brazil)"
  - pt-BR: "Inglês", "Português (Brasil)"
```

### Live update on selection

```
Given that the user is on the Settings screen and switches the active language
When the new value is committed
Then the Settings screen itself must re-render in the new language immediately
  (section titles, row titles, and picker option labels all update)
And navigating to any other tab must show that tab fully in the new language
And the tab bar labels must reflect the new language

Given that the user is on the Settings screen and switches the active currency
When the new value is committed
Then no language-level text must change
And any other tab that displays monetary amounts must reformat them to the new currency on next render
And the dashboard's primaryValue, lens rows, category cards, and timeline values must all update consistently
```

### Storage keys

```
Given that persistence is involved
When kv-store is accessed
Then the only keys this feature reads or writes are:
  - "settings:language" — string of a supported language code, or absent
  - "settings:currency" — string of a supported currency code, or absent
And any other key remains untouched by the localization layer
```
