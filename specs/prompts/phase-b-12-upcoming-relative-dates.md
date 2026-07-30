# Prompt — Upcoming: use the shared relative-date format ("Today", "5 August")

> Paste this to the coding agent. Make the Upcoming due-date labels use `formatRelativeDate` — the same helper (and same `transactions.today` / `transactions.yesterday` labels) the Transactions list uses — so a due date of today reads "Today" and others read "<day> <month>", locale-aware. Drop the "Next/Próximo" prefix (the list is already "Upcoming"). Single source of truth: `@/utils/format` `formatRelativeDate`.

## 1. Detail modal — `app/(modals)/upcoming.tsx`

- Import `formatRelativeDate` from `@/utils/format`; get `locale` from `useFormatters()` (a `now` from `useNow()` is already present).
- Replace the row subtitle. Instead of `t('upcoming.next', { date: formatDate(parseDayStart(occ.dueOn), …) })`, set the subtitle directly to:

```ts
formatRelativeDate(parseDayStart(occ.dueOn), now, locale, {
  today: t('transactions.today'),
  yesterday: t('transactions.yesterday'),
})
```

- Remove the now-unused `formatDate` destructure/import if nothing else uses it.

## 2. Summary card — `components/upcoming/upcoming-summary.tsx`

- Import `formatRelativeDate`; get `locale` from `useFormatters()` (reuse the existing `now`).
- Compute `const relativeNext = formatRelativeDate(parseDayStart(nextDate), now, locale, { today: t('transactions.today'), yesterday: t('transactions.yesterday') });`
- Pass it as the `date` in the summary copy: `t('upcoming.summary', { total: formatCurrency(total, currency), date: relativeNext })`.
- Drop `formatDate` if now unused.

## 3. i18n

- Change `upcoming.summary` to drop the "next" word (keep the middot separator):
  - en `{{total}} · {{date}}` · pt-BR `{{total}} · {{date}}` · de `{{total}} · {{date}}`
- Remove the now-unused `upcoming.next` key from all three locales (the detail modal now uses the relative date directly as the subtitle).
- Keep `transactions.today` / `transactions.yesterday` (reused, unchanged).

## Acceptance

- A due date of today shows **"Today"** (pt-BR "Hoje"); other dates show the locale-aware **"<day> <month>"** (long month), identical to the Transactions section headers.
- No "Next" / "Próximo" prefix anywhere in Upcoming; the summary card reads e.g. "R$ 188,37 · Today".
- `upcoming.next` removed; `formatRelativeDate` is the only date formatter used here.
- Repo typecheck passes; ESLint clean; no console errors.
