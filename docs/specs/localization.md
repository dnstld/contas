# Component 9 — Localization (Language)

The app has one localization preference managed at the device level:

- **Language** — drives every translatable label, plural form, and locale-aware date/number formatting. Supported values: `en` (default), `pt-BR`, and `de`.

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
  - "de" (German)
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

**Monetary formatting follows the currency, not the UI language.** An amount always looks native to its money — symbol, symbol position, and grouping/decimal separators all come from the currency's home locale (`currencyLocale()` in `data/currency.ts`), regardless of the app language. Only non-monetary text (dates, month names, counts, percentages that aren't tied to a money value) follows the UI language.

### Supported currency codes

```
Given that a wallet's currency code is read or set
Then the only accepted values must be, each formatted in its own home locale regardless of UI language:
  - "BRL" (Brazilian Real, always "R$ 1.234,56"  — via pt-BR)
  - "USD" (US Dollar,       always "$1,234.56"    — via en-US, narrow symbol "$", not "US$")
  - "EUR" (Euro,            always "1.234,56 €"    — via de-DE, symbol trailing)
And the wallet's currency column defaults to "BRL" at insert time
And the amount's symbol, symbol position, and grouping/decimal separators must all come from the
  currency's home locale via currencyLocale() (BRL → pt-BR, USD → en-US, EUR → de-DE), NOT from the
  active UI language — so a BRL wallet reads "R$ 1.234,56" whether the app is in en, pt-BR, or de
And USD uses the narrow symbol "$" (Intl currencyDisplay: 'narrowSymbol'), never "US$"
```

### Symbol position is derived from the currency, never hardcoded

```
Given that any surface renders a currency amount — including editable amount inputs that show the
  symbol beside a separate number field (the monthly-goal and transaction-amount fields)
When the symbol is placed relative to the number
Then its position (prefix/suffix) and whether a space separates it must come from utils/format.ts
  using the currency's home locale (formatCurrency for read-only text; the CurrencyInput atom —
  backed by currencyAffix — for editable amount fields), never from a hardcoded layout gap
And leaf atoms (PriceText, CurrencyInput) take only `currency` and derive their locale via
  currencyLocale(); they do NOT take a `locale` prop
And no component may call Intl.NumberFormat directly or concatenate symbol+number by hand
  (utils/format.ts is the single source of truth)
```

### Language and currency are independent

```
Given that the user has a wallet with a currency and an active language
When either changes
Then changing the language must NOT alter the wallet's currency
And changing the wallet's currency must NOT alter the language
And a monetary amount's formatting is unaffected by the UI language — it follows the currency
  (e.g. wallet.currency="BRL" → "R$ 1.234,56" whether language is en, pt-BR, or de)
  (e.g. wallet.currency="USD" → "$1,234.56" whether language is en, pt-BR, or de)
And only non-monetary text (dates, month names, counts) reflects the active language
```

### Currency is locked after wallet creation

```
Given that a wallet has been created with a currency
When any client or user attempts to change wallets.currency
Then the change must be rejected
And the currency is chosen exactly once, in the create-wallet form (smart-defaulted from the
  device region via defaultCurrencyForRegion, but the user may pick any supported currency)
And the wallet context exposes no setCurrency mutation
And Settings shows no currency row at all (currency is not editable, so it isn't surfaced there)
And the database enforces this independently of the client:
  - create_wallet() rejects any currency outside the supported set (BRL, USD, EUR)
  - a BEFORE UPDATE trigger on wallets rejects any change to the currency column
Rationale: amounts are stored as integer cents with no FX conversion, so re-labelling a wallet's
  currency would silently reinterpret every stored amount.
```

### Cross-screen consistency

```
Given that the active wallet's currency is updated
When the next render of any screen occurs
Then every monetary amount across all screens must reformat to the new currency on next render
And the dashboard's primaryValue, lens rows, category cards, transactions list, and timeline values must all update consistently
And consistency is achieved via the wallet context update + TanStack Query cache invalidation, NOT via persisted-state broadcast
```

> Per-wallet currency selection UI (a picker that writes `wallets.currency`) lives **only** in the create-wallet form (route: /wallets, reached from the Balance screen's WalletSelect control), where the user sets the initial currency for a new wallet. It is smart-defaulted from the device region but freely overridable at that point. After creation the currency is locked and is not shown in Settings at all — the Settings "Language" section contains only the language picker.

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
  - comparison.moreThan / comparison.lessThan / comparison.sameAs — {{label}} (the comparison period label;
    the shared namespace used by the Overview comparison line and each category card — the old
    "overview.vsPrevious" / "category.vsPrevious" keys were replaced by this ComparisonLine keyset)
  - category.goalOf — {{value}} (a plain formatted number, not currency)
  - categorySelect.createNamed — {{name}}
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
  - "common.appName"             — sign-in screen eyebrow (also the header wordmark)
  - "common.appTagline"          — sign-in screen headline (there is no "auth.welcome.title" key)
  - "auth.welcome.body"          — sign-in screen subtitle
  - "auth.signInWithGoogle"      — sign-in button label
  - "auth.signOut"               — sign-out button label (used in Settings → Account)
  - "auth.errors.title" / "auth.errors.generic" / "auth.errors.playServices" / "auth.errors.signInRequired"
                                 — sign-in failure Alert copy
And both en.json and pt-BR.json must define each of these keys (no missing-key fallback to en for these surfaces)
And switching the active language while signed out must update the sign-in screen labels in place
  (no app restart, no remount)
See the [Authentication spec](authentication.md) for the full auth-flow contract.
```
