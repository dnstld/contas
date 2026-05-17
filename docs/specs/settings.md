# Component 8 — Account (Conta)

The Account tab is the project's user-identity and preferences surface. It exposes:

1. **Profile card** — the signed-in user and (when present) the wallet's second member ("partner"), plus two inline actions: edit name and sign out.
2. **Invitation section** — visible only when the active wallet has a single member; lets the user generate a sharable invitation code or redeem one they received.
3. **Display** (pt-BR: "Exibição") — two persisted toggles that affect what the Status screen renders.
4. **Wallets** (pt-BR: "Carteiras") — a "My Wallets" row that opens the WalletsModal; lets the user switch between wallets or create a new one (free tier: max 2).
5. **Language & currency** (pt-BR: "Idioma e moeda") — language picker and currency picker (the currency picker writes to the active wallet's `currency` column).
6. **Danger Zone** (pt-BR: "Zona de Perigo") — leave wallet (shared wallets only, when the user has another wallet to fall back to) and delete wallet (with a two-step confirmation flow when the wallet has two members).

The screen has no page-level title; the profile card at the top provides the contextual heading.

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
  2. Invitation section (only when the active wallet has a single member)
  3. Display (key: "settings.sections.display")
  4. Wallets (key: "settings.sections.wallets")
  5. Language & currency (key: "settings.sections.regional")
  6. Danger Zone
And the page-level vertical gap between elements must be 24 points
```

### Profile card

```
Given that the Account screen is rendered
When the profile card is displayed
Then it must render as a bordered Surface (default surface tone, no padding) with 16-point corner radius
And it must contain the following stacked sub-rows, separated by horizontal hairline Dividers (inset 16):
  Row 1 — current user identity row (horizontal, items centered, 14-point gap, 16-point horizontal padding, 14-point vertical padding):
    - Avatar (44×44, borderRadius 22):
        If a non-null avatar URL is available:
          render an expo-image <Image> with the URL
        Else:
          render a muted elevated Surface containing the user's initials (first + last word initials, uppercase, max 2 chars)
    - Name/email column (flex: 1):
        Primary text: the user's display name if present, otherwise the user's email (subtitle variant, semibold)
        Secondary text: the user's email (caption variant, muted tone) — only shown when the display name is also present
  Row 2 — partner identity row (same shape as Row 1, no email line):
    - Rendered ONLY when the active wallet has a second member (useWalletMembers returns more than one entry)
    - Primary text: the partner's display_name from `profiles`, or the fallback key "wallet.partner.unnamed"
      (en: "Partner" / pt-BR: "Parceiro(a)") if their display_name is null
    - No actions on this row (partner is read-only from the current user's perspective)
  Row 3 — actions row (horizontal, 10-point gap, 16-point horizontal padding, 14-point vertical padding):
    - "Edit" button (flex: 1, pill, hairline border in theme border color, caption variant, medium weight, muted text color)
      (key: "profile.actions.editName" — en: "Edit" / pt-BR: "Editar")
    - "Sign out" button (flex: 1, pill, hairline border in theme negative color, caption variant, medium weight, negative/red text color)
      (key: "profile.actions.signOut" — en: "Sign out" / pt-BR: "Sair")
And the "Your partner" / "Seu parceiro(a)" header text must NOT be rendered — the partner row sits directly under the user row in the same Surface
```

### Profile card — data sources

```
Given that the profile card is rendered
When identity data is read
Then the current user's display_name and avatar_url must come from the `profiles` table (via useMyProfile)
And if the profile query has not resolved yet, the screen must fall back to session.user.user_metadata.full_name / avatar_url so there is no flash of empty state
And the user's email must come from session.user.email (it is not stored in the `profiles` table)
And the partner's display_name and avatar_url must come from the `profiles` table (via useWalletMembers, which fetches wallet_members then profiles by id)
And membership and profile data must refresh on screen focus (useFocusEffect → refetchMembers) so that newly-joined partners appear without an app relaunch
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
Then it must render as a bottom sheet:
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
Then it must update BOTH the auth metadata and the profiles row in parallel:
  - supabase.auth.updateUser({ data: { full_name: trimmedName } })
  - supabase.from('profiles').update({ display_name: trimmedName }).eq('id', session.user.id)
And while either call is in flight the Save button must show the "Saving…" label and be non-interactive
And on success the modal must close
And the TanStack Query caches `my-profile:<userId>` and `wallet-members:<walletId>` must be invalidated
And the profile card's displayed name must update immediately

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
```

### Invitation section — visibility

```
Given that the Account screen is rendered
When the active wallet has a single member (the current user)
Then the InvitationSection must render directly below the profile card
And when the active wallet has two members, the InvitationSection must NOT render
  (the partner row inside the profile card takes its place)
```

### Invitation section — default state

```
Given that the InvitationSection is rendered and no invitation code has been generated yet
When the user views the section
Then a section label "INVITE YOUR PARTNER" must appear above a muted Surface
  (key: "wallet.invitation.sectionTitle" — en: "Invite your partner" / pt-BR: "Convidar parceiro(a)")
And the Surface must contain two stacked pill buttons (10-point gap):
  - "Invite your partner" (filled pill in the positive/green color, white label, full width)
    (key: "wallet.invitation.inviteButton" — en: "Invite your partner" / pt-BR: "Convidar parceiro(a)")
  - "I have a code" (outlined pill, hairline border in theme border color, muted text)
    (key: "wallet.invitation.haveCodeButton" — en: "I have a code" / pt-BR: "Tenho um código")
And while the invite mutation is in flight the filled pill must display a small ActivityIndicator instead of its label
```

### Invitation section — code generated state

```
Given that the user taps "Invite your partner"
When the invitation is created
Then the client must INSERT a row into wallet_invitations with wallet_id = active and created_by = auth.uid()
And the SELECT-after-insert must return the `code` column (16 hex characters, generated by the table default)
And on success the section must transition to the "code generated" view, which must contain:
  - A muted "SHARE THIS CODE" label (key "wallet.invitation.codeLabel")
  - An elevated Surface block containing the code (body variant, semibold, letter-spacing 1.5, tabular-nums)
  - A muted caption "Expires in 7 days · single use"
    (key: "wallet.invitation.codeExpiry" — en: "Expires in 7 days · single use" / pt-BR: "Expira em 7 dias · uso único")
  - A "Share code" pill (outlined in the positive/green color, positive-colored label, horizontal padding 20)
    (key: "wallet.invitation.shareCode" — en: "Share code" / pt-BR: "Compartilhar código")
  - A small text link "I have a code instead" (caption variant, muted) that opens the redeem modal
    (key: "wallet.invitation.haveCodeLink")
```

### Invitation section — Share code

```
Given that an invitation code has been generated and is displayed
When the user taps "Share code"
Then the native React Native Share API must be invoked with the code as the message body
  (await Share.share({ message: code }))
And the system share sheet must appear
And NO clipboard library must be referenced (zero native module dependency)
```

### Redeem code modal

```
Given that the user taps "I have a code" (or "I have a code instead")
When the RedeemCodeModal is opened
Then it must render as a bottom sheet using the same structure as EditDisplayNameModal:
  - transparent full-screen Modal with fade animation
  - semi-transparent backdrop (rgba 0,0,0,0.4) that dismisses on tap
  - sheet anchored to the bottom, top corners radius 20
  - title centered, key "wallet.invitation.redeemTitle"
    (en: "Enter invitation code" / pt-BR: "Inserir código de convite")
  - TextInput auto-focused on open, autoCapitalize "none", autoCorrect off
    placeholder from key "wallet.invitation.codeInputPlaceholder"
  - error state: a danger-colored caption with key "wallet.invitation.redeemError"
    visible only after a failed redemption attempt
  - two action buttons (row, 12-point gap):
      Cancel (flex: 1, outlined pill): key "wallet.invitation.redeemCancel"
      Join wallet (flex: 1, filled positive pill):
        idle:    key "wallet.invitation.redeemButton"  (en: "Join wallet" / pt-BR: "Entrar na carteira")
        pending: key "wallet.invitation.redeeming"     (en: "Joining…"    / pt-BR: "Entrando…")

Given that the user types a non-empty code and taps "Join wallet"
When the redeem action runs
Then it must call supabase.rpc('redeem_wallet_invitation', { p_code: code.trim().toLowerCase() })
And on success the returned wallet_id must be passed to useWallet().switchWallet(joinedWalletId)
And the TanStack Query cache for `wallet-members:<joinedWalletId>` must be invalidated
And the modal must close

Given that the RPC returns an error
When the error is received
Then the error caption must become visible inside the modal
And the modal must stay open so the user can correct the code
```

### "Display" section structure

```
Given that the Account screen is rendered
When the Display section is displayed
Then it must use the SettingsSection molecule with title from key "settings.sections.display"
And the section must render a bordered Surface card containing its rows
And each row inside the section must use the SettingsRow molecule (title + optional description + trailing slot)
```

### "Show revenue" row

```
Given that the Display section is rendered
When the "Show revenue" row is displayed
Then it must show a title from key "settings.revenueVisible.title" (body variant, medium weight)
And it must show a description from key "settings.revenueVisible.description" (caption variant, muted tone)
And the trailing slot must contain a Toggle bound to the persisted-state key "dashboard:revenue-visible"
And the default value (when no persisted state exists) must be false
```

### "Demo mode" row

```
Given that the Display section is rendered
When the "Demo mode" row is displayed
Then it must show a title from key "settings.demoMode.title" (body variant, medium weight)
And it must show a description from key "settings.demoMode.description" (caption variant, muted tone)
And the trailing slot must contain a Toggle bound to the persisted-state key "settings:demo-mode"
And the default value (when no persisted state exists) must be false
```

### "Wallets" section — row

```
Given that the Account screen is rendered
When the Wallets section is displayed
Then it must use the SettingsSection molecule with title from key "settings.sections.wallets"
  (en: "Wallets" / pt-BR: "Carteiras")
And the section must contain a single SettingsRow:
  - title from key "settings.walletsRow.title" (en: "My Wallets" / pt-BR: "Minhas Carteiras")
  - description: the active wallet's name (from useWallet().name), shown when resolved
  - trailing: a pressable "Manage" label (key: "common.manage") that opens the WalletsModal
And tapping anywhere on the trailing action must open the WalletsModal
```

### WalletsModal — list view

```
Given that the user opens the WalletsModal
When the modal is displayed
Then it must render as a bottom-sheet Modal (slide animation, transparent backdrop, top-radius 20)
And the header row must contain:
  - left: empty spacer (48 pt) in list view
  - center: title from key "wallets.modalTitle" (en: "My Wallets" / pt-BR: "Minhas Carteiras")
  - right: pressable "Done" label (key: "common.done") that closes the modal
And the body must contain a ScrollView listing all wallets the current user is a member of
  (fetched via useWalletList, which queries wallet_members joined to wallets + profiles + wallet_delete_requests)
And each wallet row must show:
  - wallet name (body variant, semibold)
  - currency code and member count (caption variant, muted) — e.g. "BRL · 2 members"
  - for the active wallet: an "Active" badge (positive color, pill)
  - for inactive wallets: a "Switch" button that calls useWallet().switchWallet(id) and closes the modal
And the list must be sorted by joined_at ascending (oldest first)
And at the bottom, a "Create Wallet" button must appear:
  - label: "+ Create Wallet" (key: "wallets.createTitle")
  - when the user already belongs to 2 wallets (free-tier limit): label changes to the key "wallets.freeTierLimit"
    (en: "Upgrade to create more wallets") and the button is disabled (opacity 0.4)
```

### WalletsModal — create wallet view

```
Given that the user taps "Create Wallet" from the list view
When the create view is displayed
Then the modal header must update:
  - left: pressable "← Back" (key: "common.back") that returns to list view
  - center: title from key "wallets.createTitle" (en: "Create Wallet" / pt-BR: "Criar Carteira")
  - right: same "Done" close pressable
And the body must show a create form containing:
  - a label "NAME" (key: "wallets.nameLabel" uppercased) above a TextInput (maxLength 60, returnKeyType "done")
    placeholder from key "wallets.namePlaceholder" (en: "Wallet name" / pt-BR: "Nome da carteira")
  - a label "CURRENCY" (key: "settings.currencyRow.title" uppercased) above a SortMenu currency picker
    with the same options as the currency picker in the Language & currency section
  - two action buttons (row, 12-point gap):
      Cancel (flex: 1, outlined pill): key "common.cancel"
      Create (flex: 1, green-background pill):
        idle:    key "common.create"  (en: "Create"   / pt-BR: "Criar")
        pending: key "common.saving"  (en: "Saving…"  / pt-BR: "Salvando…")
And the Create button must be disabled (opacity 0.4) when the name field is empty
And the form must be wrapped in a ScrollView with keyboardShouldPersistTaps="handled"
  so that tapping "Create" while the keyboard is open submits in a single tap (no keyboard-dismiss intermediate step)

Given that the user submits a valid name
When the create mutation runs
Then it must call supabase.rpc('create_wallet', { p_name, p_currency })
And on success it must call useWallet().switchWallet(newWalletId) and return to the list view
And on "free_tier_limit" error the button must remain interactive but an error state must surface
  (the server is the authoritative guard; the client-side limit check is UI-only)
And the TanStack Query cache key wallets:<userId>:list must be invalidated on success
```

### "Language & currency" section structure

```
Given that the Account screen is rendered
When the Language & currency section is displayed
Then it must use the SettingsSection molecule with title from key "settings.sections.regional"
And the section must contain the Language row and the Currency row
```

### "Language" row

```
Given that the Language & currency section is rendered
When the language row is displayed
Then the title must come from key "settings.languageRow.title" (en: "Language" / pt-BR: "Idioma")
And the trailing slot must contain a SortMenu picker with options:
  1. "English" — value "en"
  2. "Portuguese (Brazil)" — value "pt-BR"
And selecting an option must call i18n.changeLanguage(value) and persist under "settings:language"
```

### "Currency" row

```
Given that the Language & currency section is rendered
When the currency row is displayed
Then the title must come from key "settings.currencyRow.title" (en: "Currency" / pt-BR: "Moeda")
And the trailing slot must contain a SortMenu picker:
  1. value "BRL" — en: "Brazilian Real (R$)" / pt-BR: "Real (R$)"
  2. value "USD" — en: "US Dollar ($)" / pt-BR: "Dólar (US$)"
  3. value "EUR" — en: "Euro (€)" / pt-BR: "Euro (€)"
And selecting an option must update the active wallet's currency column (wallets.currency) via Supabase
And NO value must be written to a "settings:currency" persisted-state key (currency is wallet-scoped)
And on success every monetary amount on screen must reformat (via the wallet context update + TanStack Query cache)
```

### Danger Zone — placement and structure

```
Given that the Account screen is rendered
When the bottom of the scroll content is reached
Then a Danger Zone block must be rendered below the Language & currency section
And the block must consist of:
  - a section label "DANGER ZONE" (key: "dangerZone.title" uppercased, caption variant, semibold, red/negative color)
  - a card (borderWidth hairline, borderColor negative + '44' transparency, borderRadius 16, overflow hidden)
    containing the Leave Wallet row (conditional) and the Delete Wallet area, separated by a hairline divider
And the card must never use a red background fill — the red is confined to borders, text, and badges
```

### Danger Zone — Leave Wallet

```
Given that the Danger Zone is rendered
When the current user's wallet membership and wallet count are evaluated
Then the Leave Wallet row must be SHOWN only when BOTH:
  - the active wallet has two members (the current user has a partner in this wallet), AND
  - the current user belongs to more than one wallet in total (useWalletList returns length > 1)
    (i.e. leaving this wallet will not leave the user with zero wallets)
And the Leave Wallet row must be HIDDEN when either condition is false

When the Leave Wallet row is rendered
Then it must display:
  - title from key "dangerZone.leave.title" (en: "Leave Wallet" / pt-BR: "Sair da Carteira")
  - description from key "dangerZone.leave.description"
    (en: "Remove yourself. Your partner keeps all data." / pt-BR: "Remove você. Seu parceiro(a) mantém todos os dados.")
  - trailing "Leave" pill button (hairline border in negative color, negative-colored label)
    (key: "dangerZone.leave.button" — en: "Leave" / pt-BR: "Sair")

Given that the user taps "Leave"
When the press is registered
Then a native Alert must appear with:
  - Title: key "wallet.leave.confirmTitle" (en: "Leave wallet?" / pt-BR: "Sair da carteira?")
  - Body: key "wallet.leave.confirmBody"
  - Cancel button (style: "cancel"): key "wallet.leave.confirmCancel"
  - Leave button (style: "destructive"): key "wallet.leave.confirmLeave"
And on confirm the mutation must DELETE from wallet_members where wallet_id = active AND user_id = auth.uid()
And on success it must call useWallet().refresh()
  (the wallet resolver re-picks the next preferred wallet; with only one remaining, get_or_create_default_wallet may create a new Personal wallet)
And on error a second Alert must appear with key "wallet.leave.errorToast"
```

### Danger Zone — Delete Wallet: no pending request

```
Given that the Danger Zone is rendered
And there is no pending wallet_delete_requests row for the active wallet
When the Delete Wallet row is displayed
Then it must show:
  - title from key "dangerZone.delete.title" (en: "Delete Wallet" / pt-BR: "Excluir Carteira")
  - description:
      when the active wallet has 1 member: key "dangerZone.delete.soloDescription"
        (en: "Permanently deletes all wallet data." / pt-BR: "Exclui permanentemente todos os dados da carteira.")
      when the active wallet has 2 members: key "dangerZone.delete.partnerDescription" with {{partner}} interpolated
        (en: "Needs {{partner}}'s approval before deleting." / pt-BR: "Precisa da aprovação de {{partner}} antes de excluir.")
  - trailing "Delete" pill button (hairline border in negative color, negative-colored label)
    (key: "dangerZone.delete.button" — en: "Delete" / pt-BR: "Excluir")

Given that the user taps "Delete" on a solo wallet (1 member)
When the press is registered
Then a native Alert must appear with:
  - Title: key "dangerZone.delete.soloTitle"
  - Body: key "dangerZone.delete.soloMessage"
  - Cancel button (style: "cancel"): key "common.cancel"
  - Delete button (style: "destructive"): key "dangerZone.delete.confirmAction"
And on confirm the mutation must call supabase.rpc('request_or_delete_wallet', { p_wallet_id })
And the RPC returns 'deleted' (solo path) and the wallet is immediately hard-deleted
And on success useWallet().refresh() is called, which bootstraps the user into their next wallet
  (or creates a new Personal wallet via get_or_create_default_wallet if none remain)

Given that the user taps "Delete" on a 2-member wallet
When the press is registered
Then a native Alert must appear with:
  - Title: key "dangerZone.delete.partnerTitle"
  - Body: key "dangerZone.delete.partnerMessage" with {{partner}} interpolated
  - Cancel button (style: "cancel"): key "common.cancel"
  - Send Request button (style: "destructive"): key "dangerZone.delete.requestAction"
And on confirm the mutation calls request_or_delete_wallet, which returns 'pending'
And the Danger Zone reactively transitions to the "waiting for partner" state (see next scenario)
  (driven by the wallet_delete_requests realtime subscription invalidating wallets:<userId>:list)
```

### Danger Zone — Delete Wallet: requester waiting for partner

```
Given that the Danger Zone is rendered
And a wallet_delete_requests row exists for the active wallet
And requested_by = the current user's id

When the Delete Wallet area is displayed
Then it must show:
  - title from key "dangerZone.delete.title" alongside a "Pending" badge
    badge key: "dangerZone.delete.waitingBadge" (en: "Pending" / pt-BR: "Pendente")
    badge style: small pill with negative color at ~10% opacity fill and ~20% opacity border
  - caption from key "dangerZone.delete.waitingCaption" with {{partner}} interpolated
    (en: "Waiting for {{partner}} to approve. You can cancel at any time.")
  - a pressable underlined "Cancel request" text link below the caption
    (key: "dangerZone.delete.cancelRequest" — en: "Cancel request" / pt-BR: "Cancelar solicitação")
And the "Delete" trailing button must NOT be shown (replaced by the pending state above)

Given that the current user taps "Cancel request"
When the mutation runs
Then it must call supabase.rpc('cancel_wallet_deletion', { p_wallet_id })
And on success the Danger Zone reactively reverts to the "no pending request" state
And the wallet itself is NOT deleted
```

### Danger Zone — Delete Wallet: partner requested, awaiting current user's approval

```
Given that the Danger Zone is rendered
And a wallet_delete_requests row exists for the active wallet
And requested_by ≠ the current user's id (the partner initiated the request)

When the Delete Wallet area is displayed
Then it must show a prominent block with a lightly red-tinted background:
  - headline from key "dangerZone.delete.partnerRequestedTitle" with {{partner}} interpolated
    (en: "{{partner}} wants to delete this wallet" / pt-BR: "{{partner}} quer excluir esta carteira")
    style: body variant, semibold, negative/red color
  - caption from key "dangerZone.delete.partnerRequestedCaption"
    (en: "Once you approve, all data will be permanently deleted and cannot be recovered.")
  - a full-width "Yes, delete the wallet" button (negative/red fill, white label, 12-point border radius)
    (key: "dangerZone.delete.approveAction" — en: "Yes, delete the wallet" / pt-BR: "Sim, excluir a carteira")
  - a full-width "Cancel request" button (surfaceMuted fill, muted label, 12-point border radius)
    (key: "dangerZone.delete.cancelRequest")

Given that the current user taps "Yes, delete the wallet"
When the press is registered
Then a native Alert must appear with:
  - Title: key "dangerZone.delete.approveTitle"
  - Body: key "dangerZone.delete.approveMessage"
  - Cancel button (style: "cancel"): key "common.cancel"
  - Approve button (style: "destructive"): key "dangerZone.delete.approveAction"
And on confirm the mutation calls supabase.rpc('confirm_wallet_deletion', { p_wallet_id })
And the wallet and all its data are hard-deleted
And on success useWallet().refresh() is called to move the user to their next wallet

Given that the current user taps "Cancel request"
When the mutation runs
Then it must call supabase.rpc('cancel_wallet_deletion', { p_wallet_id })
And on success the Danger Zone reverts to the "no pending request" state for both users (via realtime)
And the wallet itself is NOT deleted
```

### Danger Zone — reactive updates via realtime

```
Given that two users share a wallet and both have the Account screen visible
When User A triggers a deletion request (via request_or_delete_wallet)
Then the wallet_delete_requests realtime channel delivers a postgres_changes INSERT event
And useWalletRealtime invalidates the wallets:<userId>:list cache for both users
And User A's Danger Zone transitions to the "waiting for partner" state without a manual refresh
And User B's Danger Zone transitions to the "partner requested" state without a manual refresh
And both transitions must occur within the Supabase Realtime delivery latency (typically < 500 ms)

When either user taps "Cancel request"
Then the DELETE event on wallet_delete_requests propagates to both users
And both Danger Zones revert to the "no pending request" state reactively
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
And currency selections must NOT be persisted to kv-store;
  they are written to the database (wallets.currency) and propagate via the wallet context
And wallet selection (active wallet id) is persisted to kv-store under "wallet:selected-id:<userId>"
  by the wallet context (useWallet) — not directly by this screen
```

### Localization

```
Given that the active language is one of the supported languages ("en" or "pt-BR")
When the Account screen is rendered
Then every label and description must come from i18next under the keys listed in the scenarios above
And no string must be hardcoded in the screen source
And switching the language from the Language row must update every label on the screen in place
And the section order must remain consistent across languages

New i18n key namespaces introduced by this spec:
  - common.cancel / common.manage / common.back / common.done / common.loading / common.saving / common.create
  - settings.sections.wallets / settings.walletsRow.title
  - wallets.modalTitle / wallets.createTitle / wallets.nameLabel / wallets.namePlaceholder
  - wallets.freeTierLimit / wallets.activeLabel / wallets.switchButton
  - wallets.membersOne / wallets.membersMany ({{count}})
  - dangerZone.title
  - dangerZone.leave.title / description / button
  - dangerZone.delete.title / soloDescription / partnerDescription ({{partner}})
  - dangerZone.delete.button / soloTitle / soloMessage / confirmAction
  - dangerZone.delete.partnerTitle / partnerMessage ({{partner}}) / requestAction
  - dangerZone.delete.waitingBadge / waitingCaption ({{partner}}) / cancelRequest
  - dangerZone.delete.partnerRequestedTitle ({{partner}}) / partnerRequestedCaption
  - dangerZone.delete.approveTitle / approveMessage / approveAction
```

See the [Localization spec](localization.md) for the complete contract on language resolution, persistence, and cross-screen synchronization. See the [Data model spec](data-model.md) for the wallet currency contract and the delete-request RPC contracts.
