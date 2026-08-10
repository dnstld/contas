/**
 * Pure attribution logic for a transaction row, split out from the RN component
 * so it can be unit-tested in a node environment (no react-native imports).
 *
 * The row names a SUBJECT (whose transaction this is) and an optional secondary
 * clause naming someone else who touched it:
 *
 *   - plain     "<creator>"                         — nobody else involved
 *   - on-behalf "<beneficiary> · added by <actor>"  — someone entered it for the subject
 *   - edited    "<subject> · edited by <editor>"    — someone else last modified it
 *
 * The subject is the beneficiary when the transaction is on behalf of another
 * member, otherwise the creator. The "edited by" clause takes precedence over
 * "added by" and appears only when the last editor is a DIFFERENT person than
 * both the creator and the subject (otherwise it is noise: the owner touching
 * their own row).
 */

export type TransactionRowCreator = {
  userId: string | null;
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
  /** Whether the row shows an "edited by" clause. */
  isEdited: boolean;
  /** Whose avatar the row shows (the subject: beneficiary when on-behalf, else creator). */
  avatarSource: TransactionRowCreator | null;
  /** Beneficiary / subject first name for the on-behalf template; `null` otherwise. */
  beneficiaryName: string | null;
  /** Actor label ("You" / first name) for the on-behalf template; `null` otherwise. */
  actorName: string | null;
  /** Subject first name for the edited template; `null` when not edited. */
  subjectName: string | null;
  /** Editor label for the edited template; `null` when not edited. */
  editorName: string | null;
  /** Plain attribution label for the ordinary (non-on-behalf, non-edited) case. */
  plainLabel: string | null;
}

export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}

function label(creator: TransactionRowCreator, labels: RowAttributionLabels): string {
  if (creator.isMe) return labels.you;
  if (creator.displayName) return firstName(creator.displayName);
  return labels.unnamed;
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

/** Same person? Compares by user id, falling back to `isMe` when ids are absent. */
function sameActor(
  a: TransactionRowCreator | null | undefined,
  b: TransactionRowCreator | null | undefined,
): boolean {
  if (!a || !b) return false;
  if (a.userId != null && b.userId != null) return a.userId === b.userId;
  return a.isMe && b.isMe;
}

/**
 * Given the actor (`creator`), optional `beneficiary`, and optional `editor`,
 * decide how the row is attributed and return the pieces it needs. Kept
 * i18n-free (takes label primitives) so the component only interpolates the
 * template strings.
 */
export function resolveRowAttribution(
  creator: TransactionRowCreator | null,
  beneficiary: TransactionRowCreator | null | undefined,
  editor: TransactionRowCreator | null | undefined,
  labels: RowAttributionLabels,
): RowAttribution {
  // On-behalf only when the beneficiary is a genuinely DIFFERENT member than the
  // creator. A self-referential beneficiary (same person, whether or not it is
  // me) collapses to a plain row — it should never persist, but the display
  // stays correct if it does.
  const isOnBehalf = !!beneficiary && !sameActor(beneficiary, creator);
  const subject = isOnBehalf ? (beneficiary as TransactionRowCreator) : creator;

  // "edited by" is noteworthy only when the last editor differs from BOTH the
  // creator (the owner editing their own entry is not news) and the subject.
  const isEdited =
    !!editor && !sameActor(editor, creator) && !sameActor(editor, subject);

  const base: RowAttribution = {
    isOnBehalf,
    isEdited,
    avatarSource: subject,
    beneficiaryName: null,
    actorName: null,
    subjectName: null,
    editorName: null,
    plainLabel: null,
  };

  if (isEdited) {
    return {
      ...base,
      subjectName: subject ? label(subject, labels) : labels.unnamed,
      editorName: label(editor as TransactionRowCreator, labels),
    };
  }

  if (isOnBehalf) {
    return {
      ...base,
      beneficiaryName: label(beneficiary as TransactionRowCreator, labels),
      actorName: resolveCreatorLabel(creator, labels.you) ?? labels.unnamed,
    };
  }

  return {
    ...base,
    avatarSource: creator,
    plainLabel: resolveCreatorLabel(creator, labels.you),
  };
}
