import { describe, expect, it } from 'vitest';

import {
  resolveRowAttribution,
  type TransactionRowCreator,
} from '@/components/ui/molecules/transaction-row-attribution';

const LABELS = { you: 'You', unnamed: 'Someone' };

const me: TransactionRowCreator = {
  userId: 'u-me',
  displayName: 'Denis Toledo',
  avatarUrl: null,
  isMe: true,
};
const maria: TransactionRowCreator = {
  userId: 'u-maria',
  displayName: 'Maria Silva',
  avatarUrl: 'm.png',
  isMe: false,
};
const joao: TransactionRowCreator = {
  userId: 'u-joao',
  displayName: 'João Souza',
  avatarUrl: null,
  isMe: false,
};

describe('resolveRowAttribution', () => {
  it('plain row: no beneficiary → creator label, creator avatar', () => {
    const a = resolveRowAttribution(me, null, null, LABELS);
    expect(a.isOnBehalf).toBe(false);
    expect(a.isEdited).toBe(false);
    expect(a.avatarSource).toBe(me);
    expect(a.plainLabel).toBe('You');
    expect(a.beneficiaryName).toBeNull();
  });

  it('plain row: other creator uses first name', () => {
    const a = resolveRowAttribution(maria, null, null, LABELS);
    expect(a.isOnBehalf).toBe(false);
    expect(a.plainLabel).toBe('Maria');
  });

  it('on-behalf: I create for another member → beneficiary avatar + first names', () => {
    const a = resolveRowAttribution(me, maria, null, LABELS);
    expect(a.isOnBehalf).toBe(true);
    expect(a.avatarSource).toBe(maria); // beneficiary avatar is primary
    expect(a.beneficiaryName).toBe('Maria');
    expect(a.actorName).toBe('You');
    expect(a.plainLabel).toBeNull();
  });

  it("on-behalf: another member created for me → 'You · added by Maria', my avatar", () => {
    const a = resolveRowAttribution(maria, me, null, LABELS);
    expect(a.isOnBehalf).toBe(true);
    expect(a.avatarSource).toBe(me); // beneficiary (me) avatar is primary
    expect(a.beneficiaryName).toBe('You');
    expect(a.actorName).toBe('Maria');
  });

  it('degenerate both-me (should never persist) collapses to a plain row', () => {
    const a = resolveRowAttribution(me, me, null, LABELS);
    expect(a.isOnBehalf).toBe(false);
    expect(a.plainLabel).toBe('You');
  });

  it('same non-me person on both sides collapses to a plain row (the reported bug)', () => {
    // Maria created a transaction whose beneficiary is also Maria — viewed by
    // a third person. Must read plain "Maria", never "Maria · added by Maria".
    const a = resolveRowAttribution(maria, { ...maria }, null, LABELS);
    expect(a.isOnBehalf).toBe(false);
    expect(a.plainLabel).toBe('Maria');
    expect(a.beneficiaryName).toBeNull();
  });

  it('unnamed beneficiary falls back to the unnamed label', () => {
    const anon: TransactionRowCreator = {
      userId: 'u-anon',
      displayName: null,
      avatarUrl: null,
      isMe: false,
    };
    const a = resolveRowAttribution(me, anon, null, LABELS);
    expect(a.isOnBehalf).toBe(true);
    expect(a.beneficiaryName).toBe('Someone');
  });

  describe('edited by', () => {
    it('plain row edited by another member → "<creator> · edited by <editor>"', () => {
      const a = resolveRowAttribution(maria, null, joao, LABELS);
      expect(a.isEdited).toBe(true);
      expect(a.isOnBehalf).toBe(false);
      expect(a.avatarSource).toBe(maria); // subject = creator
      expect(a.subjectName).toBe('Maria');
      expect(a.editorName).toBe('João');
    });

    it('plain row edited by me → "<creator> · edited by You"', () => {
      const a = resolveRowAttribution(maria, null, me, LABELS);
      expect(a.isEdited).toBe(true);
      expect(a.subjectName).toBe('Maria');
      expect(a.editorName).toBe('You');
    });

    it('creator editing their own row is not "edited" (no news)', () => {
      const a = resolveRowAttribution(maria, null, { ...maria }, LABELS);
      expect(a.isEdited).toBe(false);
      expect(a.plainLabel).toBe('Maria');
    });

    it('edited by wins over added by, using the beneficiary as subject', () => {
      // Denis (me) added for Maria; João later edits it.
      const a = resolveRowAttribution(me, maria, joao, LABELS);
      expect(a.isEdited).toBe(true);
      expect(a.subjectName).toBe('Maria');
      expect(a.editorName).toBe('João');
      // The "added by" clause is replaced, so those fields stay null.
      expect(a.beneficiaryName).toBeNull();
      expect(a.actorName).toBeNull();
    });

    it('beneficiary editing their own on-behalf row keeps "added by" (editor == subject)', () => {
      // Denis (me) added for Maria; Maria edits it herself.
      const a = resolveRowAttribution(me, maria, { ...maria }, LABELS);
      expect(a.isEdited).toBe(false);
      expect(a.isOnBehalf).toBe(true);
      expect(a.beneficiaryName).toBe('Maria');
      expect(a.actorName).toBe('You');
    });

    it('creator editing their own on-behalf row keeps "added by" (editor == creator)', () => {
      // Denis (me) added for Maria; Denis edits it again.
      const a = resolveRowAttribution(me, maria, { ...me }, LABELS);
      expect(a.isEdited).toBe(false);
      expect(a.isOnBehalf).toBe(true);
      expect(a.beneficiaryName).toBe('Maria');
      expect(a.actorName).toBe('You');
    });
  });
});
