# Prompt — Categories empty state: use the Overview-style welcome banner

> Paste this to the coding agent. Replace the centered "No categories yet" `EmptyState` on the Categories tab with the **same banner used on Overview** (`NotificationBanner` in a bordered `Surface`), top-aligned (not centered), with a helpful tip about categories. Small change.

## 1. `app/(tabs)/categories/index.tsx` — swap the empty state

Replace the empty branch (the centered `<View style={styles.emptyState}> … <EmptyState … /></View>`) with the **same layout as the list branch** (header-offset container + `ScrollView` with content padding) rendering the banner at the top:

```tsx
if (categories.length === 0) {
  return (
    <View style={[styles.container, { backgroundColor: background, paddingTop: headerHeight }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Surface variant="plain" bordered padding={16}>
          <NotificationBanner
            title={t('categoriesTab.welcome.title')}
            subtitle={t('categoriesTab.welcome.body')}
          />
        </Surface>
      </ScrollView>
    </View>
  );
}
```

- Import `Surface` and `NotificationBanner` (`import { NotificationBanner } from '@/components/ui/molecules/notification-banner';`, `Surface` from the `@/components/ui` barrel), mirroring `app/(tabs)/(status)/index.tsx`.
- Remove the now-unused `EmptyState` import and the `emptyState` style.
- It's top-aligned (under the header), not centered.

## 2. i18n — new copy, prune old

Add `categoriesTab.welcome.title` / `.body` and remove the now-unused `categoriesTab.empty.title` / `.subtitle` (grep-verify they're unused elsewhere first).

Suggested copy (adjust freely):

- **en** — title: `Organize with categories`; body: `Group your spending into categories like Groceries or Subscriptions. Add items to each for quick suggestions and upcoming bills — tap ＋ Category to start.`
- **pt-BR** — title: `Organize com categorias`; body: `Agrupe seus gastos em categorias como Mercado ou Assinaturas. Adicione itens em cada uma para sugestões rápidas e próximos vencimentos — toque em ＋ Categoria para começar.`
- **de** — title: `Mit Kategorien organisieren`; body: `Fasse deine Ausgaben in Kategorien wie Lebensmittel oder Abos zusammen. Füge Einträge hinzu für schnelle Vorschläge und anstehende Zahlungen – tippe auf ＋ Kategorie, um zu starten.`

## Acceptance

- With zero categories, the tab shows the Overview-style banner (app logo illustration + title + tip) in a bordered surface at the **top** of the screen, below the header — not centered.
- The tip explains what categories are for and points to the ＋ Category header button.
- `categoriesTab.empty.*` removed; `categoriesTab.welcome.*` added in all three locales; no in-use key removed.
- Repo typecheck passes; ESLint clean; no console errors.
