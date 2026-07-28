# Prompt — Phase A · Step 4: Upcoming summary card (home tab, static UI)

> Paste this to the coding agent. **Static UI only** — data from `data/__fixtures__/category-items.ts`. This adds a rollup "Upcoming" section on the **Overview (home) tab, directly below the balance**. The chevron opens a detail view built in the next step (Step 4b) — for now it's a placeholder. Reuse existing primitives.

## Target design

A section titled **"Próximos"** (Upcoming), then a single filled rounded card that summarizes upcoming payments:

- **Leading:** a small stack of overlapping circular avatars (first ~3 upcoming items, by initials), with a "+N" avatar if there are more.
- **Title:** "{{count}} pagamentos" (e.g. "9 pagamentos").
- **Subtitle (muted):** "{{total}} · Próximo {{date}}" (e.g. "R$ 188,37 · Próximo 5 ago").
- **Trailing:** a `chevron.right` icon; the whole card is pressable.

## 1. Fixtures — enough recurring expenses to look real

In `data/__fixtures__/category-items.ts`, ensure there are ~**8** non-archived **expense** items with `recurrence !== 'none'`, a `nextDueOn`, and a `defaultAmount`, so the summary reads plausibly. Add a few recognizable subscriptions to the Subscriptions category (keep the existing ones; keep Spotify archived). Examples to add: Vodafone, Spotify (a *new active* one is fine only if you don't collide with the archived one — otherwise skip), Google One, HBO Max, Disney+, plus one bill in another expense category (e.g. "Internet" under Moradia). Keep names/amounts/dates realistic; stable ids.

## 2. Component — `components/upcoming/upcoming-summary.tsx`

Create `UpcomingSummary` (self-contained, reads the fixtures directly):

- Compute the summary from `MOCK_CATEGORY_ITEMS` (+ `MOCK_CATEGORIES` to get type): take non-archived items whose category `type === 'expense'` and `recurrence !== 'none'` and `nextDueOn` is set. From those:
  - `count` = number of such items,
  - `total` = sum of `defaultAmount` (treat missing as 0),
  - `nextDate` = earliest `nextDueOn` (parse with `parseDayStart`),
  - `avatarItems` = the first 3 (sorted by `nextDueOn` ascending), plus a `+N` indicator when `count > 3`.
- If `count === 0`, render nothing.
- **Layout:**
  - Section title: `Text` bold at a section-heading size (match the visual weight of the "Upcoming" example — large/bold), text `t('upcoming.title')`.
  - Card: a filled, rounded, pressable `Surface` (match the Overview card's fill/radius; `bordered={false}`) containing a `ListCardRow` (`size="sm"`, `density="comfortable"`):
    - `leading` = the avatar stack (see below),
    - `title` = `t('upcoming.paymentsCount', { count })`,
    - `subtitle` = `t('upcoming.summary', { total: <formatted>, date: <shortDate> })` where the total is formatted via `useFormatters().formatCurrency(total, currency)` (currency from `useWallet().currency`, fallback `'BRL'`) and `date` via `formatDate(parseDayStart(nextDate), { day: 'numeric', month: 'short' })`,
    - `trailing` = `Icon name="chevron.right" tone="textMuted"`,
    - `onPress` = a placeholder no-op with `// TODO(step 4b): open Upcoming detail`.
- **Avatar stack:** render each of `avatarItems` with the existing `Avatar` atom (`size="sm"`, `name={item.name}` for initials, and a `tone` color token varied per item so they read distinctly). Overlap them with a negative `marginLeft` (e.g. -12) on all but the first, each with a subtle ring (wrap in a `View` with the card's background as a thin border so overlaps read cleanly). If `count > 3`, append one more `Avatar size="sm" initials={"+" + (count - 3)}`.

## 3. Place it on the home tab

In `app/(tabs)/(status)/index.tsx`, render `<UpcomingSummary />` inside the `header` stack **between `<Overview .../>` and `<CategoryGridControls .../>`** (the `headerStack` already applies `gap: 16`). Do not modify `Overview`, the balance, or the category grid. (It reads fixtures, so it's independent of the real dashboard data — that's expected for Phase A; Phase B swaps it to real data.)

## 4. i18n

Add to all three `i18n/locales/{pt-BR,en,de}.json`:

- `upcoming.title` — pt-BR "Próximos", en "Upcoming", de "Anstehend"
- `upcoming.paymentsCount` — pluralized, pt-BR "{{count}} pagamento" / "{{count}} pagamentos"; en "{{count}} payment" / "{{count}} payments"
- `upcoming.summary` — pt-BR "{{total}} · Próximo {{date}}"; en "{{total}} · Next {{date}}"

## Constraints & acceptance

- No queries/mutations/Supabase; the card is computed from fixtures only. `useWallet`, `useFormatters`, `useTranslation`, `useRouter` are fine.
- Appears on the home tab directly below the balance, above the category grid; `Overview` untouched.
- Card matches the design: avatar stack + "{{count}} pagamentos" + "{{total}} · Próximo {{date}}" + chevron; whole card pressable (placeholder).
- Dates via `parseDayStart`; amounts via `formatCurrency`.
- Repo typecheck passes; ESLint clean; no console errors.
