# Component 9 — Localization (Language)

The app has one localization preference managed at the device level:

- **Language** — drives every translatable label, plural form, and locale-aware date/number formatting. Supported values: `en` (default) and `pt-BR`.

Currency is _not_ a device preference — it belongs to the wallet. See the "Currency formatting" section below.

Implementation stack:

- `i18next` + `react-i18next` for translation, interpolation, and locale-aware plural rules.
- `expo-localization` for reading the device's preferred language tag on first launch.
- `Intl.NumberFormat` and `Intl.DateTimeFormat` for currency, number, and month-name formatting.
- The existing `usePersistedState` hook backed by `expo-sqlite/kv-store` for language persistence.

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

### Native module unavailable (dev client not rebuilt)

```
Given that the dev client has not been rebuilt after installing expo-localization
And the native module "ExpoLocalization" is not registered in globalThis.expo.modules
When initI18n calls getDeviceLanguageTag()
Then the helper must return null without throwing and without producing a LogBox error
  (the registry is probed before requiring the JS wrapper)
And the language resolver must fall back to "en"
And the app must still boot and render in English
And the user must still be able to override language from the Settings screen
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

## Currency formatting

Currency is per-wallet (`wallets.currency` column). The active wallet's currency code flows to consumers via `useWallet().currency` (and the legacy `useCurrency()` wrapper that re-exports it). All members of a wallet see amounts formatted in that wallet's currency.

### Supported currency codes

```
Given that a wallet's currency code is read or set
Then the only accepted values must be:
  - "BRL" (Brazilian Real, formatted as R$ 1.234,56 in pt-BR / R$1,234.56 in en)
  - "USD" (US Dollar, formatted as $1,234.56 in en / US$ 1.234,56 in pt-BR)
  - "EUR" (Euro, formatted as €1,234.56 in en / € 1.234,56 in pt-BR)
And the wallet's currency column defaults to "BRL" at insert time
And the displayed grouping/decimal separators must follow the active language, not the currency
  (Intl.NumberFormat is invoked with the active language as the locale and the chosen currency code)
```

### Language and currency are independent

```
Given that the user has a wallet with a currency and an active language
When either changes
Then changing the language must NOT alter the wallet's currency
And changing the wallet's currency must NOT alter the language
And the currency symbol always reflects the wallet's currency
And the number-formatting separators always reflect the user's language choice
  (e.g. language="en" + wallet.currency="BRL" → "R$1,234.56")
  (e.g. language="pt-BR" + wallet.currency="USD" → "US$ 1.234,56")
```

### Currency does not convert amounts

```
Given that a wallet's currency is changed
When the dashboard re-renders
Then the underlying numeric amounts (stored as integer cents) must remain unchanged
And only the currency symbol and number-formatting rules must change
And no exchange-rate lookup, conversion, or rounding adjustment must occur
  (e.g. an amount stored as 10000 cents will render as R$ 100,00 or $100.00 or €100.00 depending on the wallet's currency)
```

### Cross-screen consistency

```
Given that the active wallet's currency is updated
When the next render of any screen occurs
Then every monetary amount across all screens must reformat to the new currency on next render
And the dashboard's primaryValue, lens rows, category cards, transactions list, and timeline values must all update consistently
And consistency is achieved via the wallet context update + TanStack Query cache invalidation, NOT via persisted-state broadcast
```

> Per-wallet currency selection UI (a picker that writes `wallets.currency`) is exposed in Settings → Language & currency → Currency row. The same currency picker is also available in the WalletsModal create-wallet form, where the user sets the initial currency for a new wallet.

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
  - wallets.membersMany (e.g. "2 members" / "2 membros") — wallets.membersOne used for count = 1 (not a plural suffix key)
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
  - dangerZone.delete.partnerDescription — {{partner}}
  - dangerZone.delete.partnerMessage — {{partner}}
  - dangerZone.delete.waitingCaption — {{partner}}
  - dangerZone.delete.partnerRequestedTitle — {{partner}}
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

### Live update on language change

```
Given that the user is on the Settings screen and switches the active language
When the new value is committed
Then the Settings screen itself must re-render in the new language immediately
  (section titles, row titles, and picker option labels all update)
And navigating to any other tab must show that tab fully in the new language
And the tab bar labels must reflect the new language
```

### Storage keys

```
Given that persistence is involved
When kv-store is accessed
Then the only keys this feature reads or writes are:
  - "settings:language" — string of a supported language code, or absent
And any other key remains untouched by the localization layer
And no "settings:currency" key is written or read (the currency lives on wallets.currency in the database)
```

### Authentication surface keys

```
Given that the authentication screen and the Settings Account row are translatable surfaces
When their labels are sourced
Then they must come from i18next under these keys (added in the authentication feature):
  - "auth.welcome.title"         — sign-in screen primary heading
  - "auth.welcome.body"          — sign-in screen subtitle
  - "auth.signInWithGoogle"      — sign-in button label
  - "auth.signOut"               — sign-out button label (used in Settings → Account)
  - "settings.sections.account"  — Account section title in Settings
  - "settings.signOutRow.title"  — Sign-out row title in Settings
  - "settings.signOutRow.description" — Sign-out row description in Settings
And both en.json and pt-BR.json must define each of these keys (no missing-key fallback to en for these surfaces)
And switching the active language while signed out must update the sign-in screen labels in place
  (no app restart, no remount)
See the [Authentication spec](authentication.md) for the full auth-flow contract.
```
