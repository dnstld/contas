/**
 * Pure attribution logic for a transaction row, split out from the RN component
 * so it can be unit-tested in a node environment (no react-native imports).
 *
 * A row is attributed to the actor (`creator` = `transactions.created_by`)
 * unless it names a distinct `beneficiary` (`transactions.on_behalf_of`), in
 * which case it reads "<beneficiary> · added by <actor>".
 */

export type TransactionRowCreator = {
  displayName: string | null;
  avatarUrl: string | null;
  isMe: boolean;
};

export interface RowAttributionLabels {
  /** Label for the current user ("You"). */
  you: string;
  /** Fallback when a member has no display name. */
  unnamed: string;
}

export interface RowAttribution {
  /** Whether the row is attributed to a beneficiary other than the actor. */
  isOnBehalf: boolean;
  /** Whose avatar the row shows (beneficiary when on-behalf, else creator). */
  avatarSource: TransactionRowCreator | null;
  /** Beneficiary first name for the on-behalf template; `null` when not on-behalf. */
  beneficiaryName: string | null;
  /** Actor label ("You" / first name) for the on-behalf template. */
  actorName: string | null;
  /** Plain attribution label for the ordinary (non-on-behalf) case. */
  plainLabel: string | null;
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function resolveCreatorLabel(
  creator: TransactionRowCreator | null,
  youLabel: string,
): string | null {
  if (!creator) return null;
  if (creator.isMe) return youLabel;
  if (creator.displayName) return firstName(creator.displayName);
  return null;
}

/**
 * Given the actor (`creator`) and optional `beneficiary`, decide whether the
 * row is "on behalf of" someone and return the pieces the row needs. Kept
 * i18n-free (takes label primitives) so the component only interpolates the
 * template string.
 */
export function resolveRowAttribution(
  creator: TransactionRowCreator | null,
  beneficiary: TransactionRowCreator | null | undefined,
  labels: RowAttributionLabels,
): RowAttribution {
  // A non-null beneficiary means `on_behalf_of` was explicitly set — which the
  // create/edit form only does for a member OTHER than the creator (self is
  // stored as null). So any beneficiary is a genuine on-behalf attribution,
  // whichever side of it the current viewer is on. The degenerate both-me case
  // (should never persist) collapses to a plain row.
  const isOnBehalf = !!beneficiary && !(beneficiary.isMe && (creator?.isMe ?? false));

  if (isOnBehalf) {
    const b = beneficiary as TransactionRowCreator;
    return {
      isOnBehalf: true,
      avatarSource: b,
      beneficiaryName: b.isMe
        ? labels.you
        : b.displayName
          ? firstName(b.displayName)
          : labels.unnamed,
      actorName: resolveCreatorLabel(creator, labels.you) ?? labels.unnamed,
      plainLabel: null,
    };
  }

  return {
    isOnBehalf: false,
    avatarSource: creator,
    beneficiaryName: null,
    actorName: null,
    plainLabel: resolveCreatorLabel(creator, labels.you),
  };
}
