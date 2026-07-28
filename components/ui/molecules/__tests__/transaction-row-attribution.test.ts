import { describe, expect, it } from 'vitest';

import {
  resolveRowAttribution,
  type TransactionRowCreator,
} from '@/components/ui/molecules/transaction-row-attribution';

const LABELS = { you: 'You', unnamed: 'Someone' };

const me: TransactionRowCreator = { displayName: 'Denis Toledo', avatarUrl: null, isMe: true };
const maria: TransactionRowCreator = { displayName: 'Maria Silva', avatarUrl: 'm.png', isMe: false };

describe('resolveRowAttribution', () => {
  it('plain row: no beneficiary → creator label, creator avatar', () => {
    const a = resolveRowAttribution(me, null, LABELS);
    expect(a.isOnBehalf).toBe(false);
    expect(a.avatarSource).toBe(me);
    expect(a.plainLabel).toBe('You');
    expect(a.beneficiaryName).toBeNull();
  });

  it('plain row: other creator uses first name', () => {
    const a = resolveRowAttribution(maria, null, LABELS);
    expect(a.isOnBehalf).toBe(false);
    expect(a.plainLabel).toBe('Maria');
  });

  it('on-behalf: I create for another member → beneficiary avatar + first names', () => {
    const a = resolveRowAttribution(me, maria, LABELS);
    expect(a.isOnBehalf).toBe(true);
    expect(a.avatarSource).toBe(maria); // beneficiary avatar is primary
    expect(a.beneficiaryName).toBe('Maria');
    expect(a.actorName).toBe('You');
    expect(a.plainLabel).toBeNull();
  });

  it("on-behalf: another member created for me → 'You · added by Maria', my avatar", () => {
    const a = resolveRowAttribution(maria, me, LABELS);
    expect(a.isOnBehalf).toBe(true);
    expect(a.avatarSource).toBe(me); // beneficiary (me) avatar is primary
    expect(a.beneficiaryName).toBe('You');
    expect(a.actorName).toBe('Maria');
  });

  it('degenerate both-me (should never persist) collapses to a plain row', () => {
    const a = resolveRowAttribution(me, me, LABELS);
    expect(a.isOnBehalf).toBe(false);
    expect(a.plainLabel).toBe('You');
  });

  it('unnamed beneficiary falls back to the unnamed label', () => {
    const anon: TransactionRowCreator = { displayName: null, avatarUrl: null, isMe: false };
    const a = resolveRowAttribution(me, anon, LABELS);
    expect(a.isOnBehalf).toBe(true);
    expect(a.beneficiaryName).toBe('Someone');
  });
});
