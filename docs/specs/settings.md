# Component 8 — Account (Conta)

The Account tab is the project's user-identity and preferences surface. It exposes:

1. **Account section** — a horizontal carousel of `SquareCard` tiles: the current user, any other members of
   the active wallet, and any outgoing invitations (pending or declined), followed by an "Add account" tile
   that opens the invite-by-email screen. Tapping your own card opens the edit-name screen.
2. **Display** (pt-BR: "Exibição") — two persisted toggles that affect what the Status screen renders.
3. **Language & currency** (pt-BR: "Idioma e moeda") — language picker and currency picker.
4. **Danger Zone** (label from key "dangerZone.title", en: "Advanced") — sign out, leave wallet (shared
   wallets only, when the user has another wallet to fall back to), and delete wallet (with a two-step
   confirmation flow when the wallet has two members).

Wallet switching and creation no longer live on this screen. They moved to the `WalletSelect` control at
the top of the Balance screen (`components/settings/wallet-select.tsx`), which is now the single place to
manage wallets — this spec does not cover that control.

> Note on language: this spec uses the English copy because English is the default language. Equivalent Portuguese strings are listed alongside where they're material to the contract. The full string contract lives in `i18n/locales/en.json` and `i18n/locales/pt-BR.json`.

## Scenarios

### Screen placement and chrome

```
Given that the user is logged in
When the Account tab is selected
Then the screen must render its own scrollable layout (no shared header)
And content must scroll independently of the tab bar
And the screen background must use the theme's background color
```

### Section ordering

```
Given that the Account screen is rendered
When its sections are displayed top-to-bottom
Then the order must be:
  1. Account section (the SquareCard carousel, key "settings.sections.account")
  2. Display (key: "settings.sections.display")
  3. Language & currency (key: "settings.sections.regional")
  4. Danger Zone
And the page-level vertical gap between elements must be 16 points
  (matching the section spacing used on the Balance and Transactions screens)
```

### Account section — structure

```
Given that the Account screen is rendered
When the Account section is displayed
Then a caption label must appear above the row, uppercased, from key "settings.sections.account"
  (en: "Account" / pt-BR: "Conta")
And below it a horizontally-scrolling row of fixed-size (116×116) SquareCard tiles must render, in order:
  1. The current user — avatar (or initials fallback), display name (or the auth metadata fallback, or email),
     and a "pencil" edit badge overlaid on the avatar signaling the card is editable
  2. Any other members of the active wallet — avatar, display name (or the "wallet.partner.unnamed" fallback), no badge
  3. Any outgoing invitations for the active wallet, in list order:
       - pending invites: name from key "settings.accountCards.invitePending" (en: "Pending"), "pending" avatar badge
       - declined invites: name from key "settings.accountCards.inviteDeclined" (en: "Declined"), no avatar badge
     each invite card's subtitle is the invitee's email
  4. An "Add account" tile (AddSquareCard) with a "+" icon and label from key "settings.accountCards.add"
     (en: "Add account") — opens the invite-by-email screen
And each card's avatar falls back to initials (from the display name, or the invite email) when no avatar URL is available
```

### Account section — data sources

```
Given that the Account section is rendered
When identity and membership data are read
Then the current user's display_name and avatar_url must come from the `profiles` table (via useMyProfile)
And the current user's email must come from session.user.email (it is not stored in the `profiles` table)
And when useMyProfile has not resolved yet, the screen falls back to session.user.user_metadata.full_name / avatar_url
  so there is no flash of empty state
And other wallet members must come from useWalletMembers (wallet_members joined with profiles)
And outgoing invitations must come from useOutgoingInvitations, scoped to the active wallet
And membership and invitation data must refresh on screen focus (useFocusEffect → refetchMembers + refetchInvites)
  so that newly-joined partners and invite status changes appear without an app relaunch
```

### Account section — tapping a card

```
Given that the Account section is rendered
When the user taps their own card
Then the app must navigate to the "Edit name" screen (route: /edit-display-name)

When the user taps a pending invite card
Then a native Alert must appear with the invitee's email as the title, body from key "settings.accountCards.pendingPrompt"
  (en: "This invite is waiting to be accepted."), and two actions:
    - "Check status" (key "settings.accountCards.checkStatus") — refetches invitations and membership;
      if the invite is still pending, a toast shows key "settings.accountCards.stillPending"
    - "Cancel invite" (key "settings.accountCards.cancelInvite", destructive) — cancels the invitation

When the user taps a declined invite card
Then a native Alert must appear with the invitee's email as the title, body from key "settings.accountCards.declinedPrompt"
  (en: "They declined this invite."), and two actions:
    - "Invite again" (key "settings.accountCards.reInvite") — re-sends the invitation to the same email,
      showing a success toast (key "wallet.invitation.sentToast") on success
    - "Dismiss" (key "settings.accountCards.dismiss", destructive) — cancels/removes the declined invite

When the user taps the "Add account" tile
Then the app must navigate to the invite-by-email screen (route: /invite-member)
```

### Edit name screen

```
Given that the user navigates to /edit-display-name
When the screen is displayed
Then it must render using the ModalFormScaffold template:
  - title centered: key "profile.editName.title" (subtitle variant, semibold)
    (en: "Edit Name" / pt-BR: "Editar nome")
  - label above the input: key "profile.editName.nameLabel" uppercased
    (en: "Name" / pt-BR: "Nome")
  - TextInput pre-filled with the current display name (once useMyProfile resolves), maxLength DISPLAY_NAME_MAX_LENGTH,
    returnKeyType "done", placeholder from key "profile.editName.namePlaceholder"
  - the input auto-focuses ~250ms after the screen becomes visible
  - a single full-width footer button, key "profile.editName.save" (en: "Save"),
    showing a loading state while the save is in flight, disabled when the trimmed name is empty

Given that the user submits a non-empty name
When the save mutation runs (useUpdateMyProfile)
Then it must update the display name and, on success, navigate back (router.back())
And on failure the screen stays open — the error is surfaced via the global MutationCache toast, not an inline message
```

### Invite by email screen

```
Given that the user navigates to /invite-member
When the screen is displayed
Then it must render using the ModalFormScaffold template:
  - a NotificationBanner with title from key "wallet.invitation.sectionTitle" (en: "Share with someone")
    and subtitle from key "wallet.invitation.description" with {{app}} interpolated
    (en: "Invite someone by email. The next time they open {{app}}, they'll see your invitation and can join this wallet.")
  - a labeled email TextInput (label key "wallet.invitation.emailLabel", placeholder key "wallet.invitation.emailPlaceholder"),
    autoCapitalize "none", autoCorrect off, keyboardType "email-address", auto-focused ~250ms after the screen appears
  - a single full-width footer button, key "wallet.invitation.sendButton" (en: "Send invite"),
    disabled while the email field is empty or a send is in flight

Given that the user submits a non-empty email
When the invite mutation runs (useInviteToWallet → the invite_to_wallet RPC)
Then on success a toast shows key "wallet.invitation.sentToast" with the invitee's email, and the screen navigates back
And on failure an inline error caption appears below the input, mapped from the RPC's error message:
  - invalid email        → "wallet.invitation.errorInvalidEmail"
  - inviting yourself    → "wallet.invitation.errorSelf"
  - already a member     → "wallet.invitation.errorAlreadyMember"
  - free-tier invite cap → "wallet.invitation.errorLimit"
  - offline              → "common.errors.network"
  - anything else        → "wallet.invitation.error" (also captured for monitoring, since it's unmapped)
```

### "Display" section structure

```
Given that the Account screen is rendered
When the Display section is displayed
Then it must use the shared `SectionList` organism (variant="card") with a section title from key "settings.sections.display"
And the section must render a bordered Surface card containing its rows
And each row inside the section must use the SectionListRow molecule (title + optional description + trailing slot)
```

### "Show balance" row

```
Given that the Display section is rendered
When the "Show balance" row is displayed
Then it must show a title from key "settings.revenueVisible.title" (body variant, medium weight)
And it must show a description from key "settings.revenueVisible.description" (caption variant, muted tone)
  — or, when there is no revenue/income activity yet, key "settings.revenueVisible.descriptionDisabled"
And the trailing slot must contain a Toggle bound to the persisted-state key "dashboard:revenue-visible"
And the default value (when no persisted state exists) must be false
And the toggle must be disabled when there is no income transaction yet
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

### "Language & currency" section structure

```
Given that the Account screen is rendered
When the Language & currency section is displayed
Then it must use the shared `SectionList` organism (variant="card") with a section title from key "settings.sections.regional"
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
  - a section label (key: "dangerZone.title" uppercased, caption variant, semibold, red/negative color)
    (en: "Advanced")
  - a card (hairline border, borderColor negative at ~27% transparency, borderRadius 16, overflow hidden)
    containing, separated by hairline dividers:
      1. Sign out row — always shown
      2. Leave Wallet row — conditional (see "Danger Zone — Leave Wallet")
      3. Delete Wallet area — state-driven (see the Delete Wallet scenarios)
And the card must never use a red background fill — the red is confined to borders, text, and badges
```

### Danger Zone — Sign out

```
Given that the Danger Zone is rendered
When the Sign out row is displayed
Then it must show a title and description from keys "settings.signOutRow.title" / "settings.signOutRow.description"
  (en: "Sign out" / "End your session on this device.")
And the trailing action must be a pill button labeled from key "profile.actions.signOut" (en: "Sign out",
  hairline border in negative color, negative-colored label)

Given that the user taps the Sign out button
Then a native Alert must appear titled from "settings.signOutRow.title" with body "settings.signOutRow.description"
  and a destructive action labeled from "profile.actions.signOut"
And on confirm, useAuth().signOut() must be called
And after sign-out completes, the root layout's route gate must redirect the user to /authentication
```

### Danger Zone — Leave Wallet

```
Given that the Danger Zone is rendered
When the current user's wallet membership and wallet count are evaluated
Then the Leave Wallet row must be SHOWN only when BOTH:
  - the active wallet has a second member (the current user has a partner in this wallet), AND
  - the current user belongs to more than one wallet in total (useWalletList returns length > 1)
And the Leave Wallet row must be HIDDEN when either condition is false

When the Leave Wallet row is rendered
Then it must display:
  - title from key "dangerZone.leave.title" (en: "Leave wallet")
  - description from key "dangerZone.leave.description" (en: "Remove yourself. The other person keeps all data.")
  - trailing "Leave" pill button (hairline border in negative color, negative-colored label)
    (key: "dangerZone.leave.button"), replaced by an ActivityIndicator while the mutation is in flight

Given that the user taps "Leave"
When the press is registered
Then a native Alert must appear with:
  - Title: key "wallet.leave.confirmTitle"
  - Body: key "wallet.leave.confirmBody"
  - Cancel button (style: "cancel"): key "wallet.leave.confirmCancel"
  - Leave button (style: "destructive"): key "wallet.leave.confirmLeave"
And on confirm the useLeaveWallet mutation must DELETE from wallet_members where wallet_id = active AND user_id = auth.uid()
And on success the TanStack Query cache for the wallet list (walletKeys.list(userId)) must be invalidated
And then useWallet().refresh() must be called (the wallet resolver re-picks the next preferred wallet)
And on error a second Alert must appear with key "wallet.leave.errorToast"
```

### Danger Zone — Delete Wallet: no pending request

```
Given that the Danger Zone is rendered
And there is no pending wallet_delete_requests row for the active wallet
When the Delete Wallet row is displayed
Then it must show:
  - title from key "dangerZone.delete.title"
  - description:
      when this is the user's only wallet (wallets.length ≤ 1): key "dangerZone.delete.lastWalletDescription"
      else when the active wallet has 1 member: key "dangerZone.delete.soloDescription"
      else (active wallet has 2 members): key "dangerZone.delete.partnerDescription" with {{partner}} interpolated
  - trailing "Delete" pill button (hairline border in negative color, negative-colored label)
    (key: "dangerZone.delete.button"), dimmed (opacity 0.4) and disabled when this is the user's only wallet

Given that the user taps "Delete" on a solo wallet (1 member, not the user's only wallet)
When the press is registered
Then a native Alert must appear with title "dangerZone.delete.soloTitle", body "dangerZone.delete.soloMessage"
And on confirm the mutation calls supabase.rpc('request_or_delete_wallet', { p_wallet_id })
And on success useWallet().refresh() is called and the wallet list cache is invalidated

Given that the user taps "Delete" on a 2-member wallet
When the press is registered
Then a native Alert must appear with title "dangerZone.delete.partnerTitle", body "dangerZone.delete.partnerMessage"
And on confirm the mutation calls request_or_delete_wallet which returns 'pending'
And the Danger Zone reactively transitions to the "waiting for partner" state
```

### Danger Zone — Delete Wallet: requester waiting for partner

```
Given that a wallet_delete_requests row exists for the active wallet
And requested_by = the current user's id

When the Delete Wallet area is displayed
Then it must show:
  - title alongside a "Pending" badge (key: "dangerZone.delete.waitingBadge")
  - caption from key "dangerZone.delete.waitingCaption" with {{partner}} interpolated
  - a pressable underlined "Cancel request" text link (key: "dangerZone.delete.cancelRequest")
And the "Delete" trailing button must NOT be shown

Given that the user taps "Cancel request"
Then it must call supabase.rpc('cancel_wallet_deletion', { p_wallet_id })
And on success the Danger Zone reactively reverts to the "no pending request" state
```

### Danger Zone — Delete Wallet: partner requested, awaiting current user's approval

```
Given that a wallet_delete_requests row exists for the active wallet
And requested_by ≠ the current user's id

When the Delete Wallet area is displayed
Then it must show a lightly red-tinted block with:
  - headline from key "dangerZone.delete.partnerRequestedTitle" (body, semibold, negative color) with {{partner}} interpolated
  - caption from key "dangerZone.delete.partnerRequestedCaption"
  - full-width "Yes, delete the wallet" button (negative fill, white label)
    (key: "dangerZone.delete.approveAction")
  - full-width "Cancel request" button (surfaceMuted fill, muted label)
    (key: "dangerZone.delete.cancelRequest")

Given that the user taps "Yes, delete the wallet"
Then a native Alert must confirm (title "dangerZone.delete.approveTitle", body "dangerZone.delete.approveMessage")
  before calling supabase.rpc('confirm_wallet_deletion', { p_wallet_id })
And on success useWallet().refresh() is called and the wallet list cache is invalidated
```

### Danger Zone — reactive updates via realtime

```
Given that two users share a wallet and both have the Account screen visible
When User A triggers a deletion request
Then useWalletRealtime invalidates the wallet list cache for both users
And both Danger Zones transition states without a manual refresh
And both transitions must occur within Supabase Realtime delivery latency (typically < 500 ms)
```

### Persistence

```
Given that the user toggles any toggle or picks a new value on this screen
When the change is committed
Then device-scoped preferences must be persisted to local storage immediately (expo-sqlite KV store)
And the storage keys owned by this screen are:
  - "dashboard:revenue-visible"   (boolean)
  - "settings:demo-mode"          (boolean)
  - "settings:language"           (supported language code: "en" or "pt-BR")
And currency selections must NOT be persisted to kv-store (written to wallets.currency)
And wallet selection is persisted under "wallet:selected-id:<userId>" by the wallet context
```

### Localization

```
Given that the active language is one of the supported languages ("en" or "pt-BR")
When the Account screen is rendered
Then every label and description must come from i18next under the keys listed in the scenarios above
And no string must be hardcoded in the screen source
And switching the language must update every label on the screen in place

Key namespaces used by this screen:
  - common.cancel / common.errors.network
  - settings.sections.account / settings.sections.display / settings.sections.regional
  - settings.accountCards.add / invitePending / inviteDeclined / pendingPrompt / declinedPrompt /
    checkStatus / cancelInvite / reInvite / dismiss / stillPending
  - settings.signOutRow.title / description
  - settings.revenueVisible.title / description / descriptionDisabled
  - settings.demoMode.title / description
  - settings.languageRow.title / settings.currencyRow.title
  - profile.actions.signOut
  - profile.editName.title / nameLabel / namePlaceholder / save
  - wallet.invitation.sectionTitle / description / emailLabel / emailPlaceholder / sendButton /
    sentToast / errorInvalidEmail / errorSelf / errorAlreadyMember / errorLimit / error
  - wallet.leave.confirmTitle / confirmBody / confirmCancel / confirmLeave / errorToast
  - wallet.partner.unnamed
  - dangerZone.title / leave.* / delete.*
```

See the [Localization spec](localization.md) for the complete contract on language resolution, persistence, and cross-screen synchronization. See the [Data model spec](data-model.md) for the wallet currency contract and the delete-request RPC contracts.
