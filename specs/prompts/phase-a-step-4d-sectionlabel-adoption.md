# Prompt — Phase A · Step 4d: adopt `SectionLabel` for app section titles

> Paste this to the coding agent. Consistency refactor: route the transactions, categories, and account section titles through the shared `SectionLabel` (from Step 4c). These touch **real, working screens** — preserve all behavior; only the title's rendering component/style changes. Static where applicable.

**Prereq:** `SectionLabel` exists (Step 4c). If not, create it first per that prompt.

## 0. Extend `SectionLabel` with an optional tone

In `components/ui/molecules/section-label.tsx`, add `tone?: keyof typeof Colors.light` (default `'textMuted'`) and pass it as the `Text` `tone`. Everything else unchanged (uppercased, `variant="caption"`, `weight="medium"`, `letterSpacing: 0.8`).

## 1. `SectionList` organism — both variants use `SectionLabel`

In `components/ui/organisms/section-list.tsx`:

- **Flat variant** (`FlatSectionHeader`): replace the inline `<Text variant="caption" tone="textMuted" weight="semibold">{title.toUpperCase()}</Text>` with `<SectionLabel label={title} />`. Keep the wrapping `View` and its padding / `headerSpaced` marginTop.
- **Card variant** (`CardSectionList`): replace the `<SectionHeader … />` used for the section title with a small header that uses `SectionLabel`, **preserving** optional `subtitle` and `trailing`:

```tsx
{section.title || section.subtitle || section.trailing ? (
  <View style={cardStyles.header}>
    <View style={cardStyles.headerText}>
      {section.title ? <SectionLabel label={section.title} /> : null}
      {section.subtitle ? (
        <Text variant="caption" tone="textMuted">{section.subtitle}</Text>
      ) : null}
    </View>
    {section.trailing ? <View>{section.trailing}</View> : null}
  </View>
) : null}
```

Add `cardStyles.header` (`flexDirection: 'row'`, `alignItems: 'center'`, `justifyContent: 'space-between'`, `gap: 12`) and `cardStyles.headerText` (`flex: 1`, `gap: 2`). Drop the now-unused `SectionHeader` import from this file. (Leave the `SectionHeader` component/file itself in place — it stays exported.)

This single change updates: the **transactions** day-group headers, the **categories** "Expenses"/"Income" headers, and the **account** "Display"/"Language" headers.

## 2. `AccountCards` — "Account" label

In `components/settings/account-cards.tsx`, replace the inline `<Text variant="caption" weight="semibold" tone="textMuted" style={styles.label}>{t('settings.sections.account').toUpperCase()}</Text>` with `<SectionLabel label={t('settings.sections.account')} />`. Remove the now-unused `styles.label` if nothing else uses it.

## 3. `DangerZone` — "Advanced" label

In `components/settings/danger-zone.tsx`, replace the inline section-title `Text` (`t('dangerZone.title')`, currently colored with `dangerColor`) with `<SectionLabel label={t('dangerZone.title')} tone="negative" />`. **Keep it red** (`tone="negative"`) to preserve the current danger cue — do not change its color. Remove `styles.sectionLabel` if unused.

## Constraints & acceptance

- Transactions, Categories (Expenses/Income), Account (Account/Display/Language), and Advanced section titles all render via the shared `SectionLabel` — identical style (uppercased, muted, `caption`, `weight="medium"`, `letterSpacing 0.8`), except Advanced which stays red via `tone="negative"`.
- All existing behavior/layout is intact: card sections still show their rows in a bordered `Surface`; section `subtitle`/`trailing` still render; transactions day-group spacing preserved; DangerZone actions unchanged.
- No screen other than the section-title styling changes.
- Repo typecheck passes; ESLint clean; no unused imports/styles; no console errors.
