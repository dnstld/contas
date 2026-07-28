# Prompt — Phase A · Step 2c: items UI polish (fix-ups)

> Paste this to the coding agent. **Static UI only** (fixtures, no queries/mutations/Supabase). Small corrections to the Categories tab + items modal.

## 1. Unify the two "add" buttons by reusing the existing `PressableButton`

Right now "Add category" (`app/(tabs)/categories/index.tsx` — a bordered `Surface` + `SectionListRow`) and "Add item" (`app/(modals)/category-items.tsx` — a tinted custom `Pressable` "createRow") are **two different implementations with different looks**. Do **not** build a new component — reuse the existing **`PressableButton`** atom (`@/components/ui`) for both:

- Use `<PressableButton variant="secondary" iconName="plus" label={…} onPress={…} />` in **both** places (same variant/size, so they render identically).
- Categories tab: replace the `Surface` + `SectionListRow` add-category block with the `PressableButton` (label `t('categoriesTab.addCategory')`, keep the `// TODO(step 5)` comment). Remove the now-unused `Surface` import if nothing else needs it.
- Items modal: replace the inline `createRow` `Pressable` with the `PressableButton` (label `t('categoryItems.addItem')`, keep `// TODO(step 3)`), and delete the now-dead `createRow` / `pressed` styles and the `tintColor` local if unused.
- Keep both buttons left/full-width consistent with how `PressableButton` is used elsewhere (e.g. modal footers). Don't add custom styling beyond an optional `style` for spacing.

## 2. Remove the installment "12x · 3 de 12" display

- In `app/(modals)/category-items.tsx`, delete the installment `Badge` branch in `recurrenceBadges` and the `MOCK_PAID_COUNT` import/usage.
- In `data/__fixtures__/category-items.ts`, remove the `MOCK_PAID_COUNT` export, and remove `recurrenceTotalCount` from the `iPhone 15` fixture item (leave it a plain monthly item).
- Remove the `categoryItems.installment` key from all three locale files.
- Leave the `recurrenceTotalCount` field on the `CategoryItem` type as-is (unused for now).

## 3. Recurrence line: new wording, plain text, left-aligned

Replace the frequency **`Badge`** with a **plain muted text line** passed to the row's `subtitle` (a string, so `ListCardRow` left-aligns it under the title — this fixes the "slightly indented" look the pill caused). Drop the `Badge` usage and the `badges` style wrapper entirely; `recurrenceBadges` becomes a single `recurrenceLine(item): string | undefined`.

New wording (natural phrase, not "Monthly · dia 10"):

- `monthly` → `t('categoryItems.recurrence.monthly', { date })` → **"Every month, next 10 Aug"** / pt-BR **"Todo mês, próximo 10 ago"**
- `weekly`  → `t('categoryItems.recurrence.weekly',  { date })` → "Every week, next {{date}}" / pt-BR "Toda semana, próximo {{date}}"
- `yearly`  → `t('categoryItems.recurrence.yearly',  { date })` → "Every year, next {{date}}" / pt-BR "Todo ano, próximo {{date}}"
- `daily`   → `t('categoryItems.recurrence.daily')` → "Every day" / pt-BR "Todo dia" (no date)
- `none`    → `undefined` (no subtitle)

`{{date}}` = the item's `nextDueOn` (parse with `parseDayStart`) formatted as day + short month via `Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' })`, where `locale` comes from `useFormatters()`. If a dated recurrence has no `nextDueOn`, fall back to the phrase without the ", next …" part (add a `*NoDate` variant key, e.g. `categoryItems.recurrence.monthlyNoDate` = "Every month" / "Todo mês").

Update the `categoryItems.recurrence.*` keys accordingly in all three locales, and remove the now-unused `categoryItems.dueDay` key.

## Acceptance

- Add-category and Add-item render the **same** `PressableButton` (variant `secondary`, `plus` icon); no new component was created.
- No installment text anywhere; `MOCK_PAID_COUNT` gone.
- Item subtitle reads e.g. "Todo mês, próximo 10 ago" as plain muted text, left-aligned directly under the item name (no pill, no indent). Netflix → "Todo mês, próximo 5 ago"; Amazon Prime → "Todo ano, próximo 20 nov"; a `none` item → no subtitle.
- Repo typecheck passes; ESLint clean; no unused imports/styles; no console errors.
