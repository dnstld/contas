import { useMemo } from 'react';

import type { TransactionRowCreator } from '@/components/ui/molecules/transaction-row';
import { useAuth } from '@/hooks/use-auth';
import { useMyProfile } from '@/hooks/use-my-profile';
import { useWalletMembers } from '@/hooks/use-wallet-members';

const DEMO_USER_SELF = 'demo-user-self';
const DEMO_USER_PARTNER = 'demo-user-partner';

export function useTransactionCreators() {
  const { session } = useAuth();
  const myUserId = session?.user.id ?? null;
  const { displayName: myDisplayName, avatarUrl: myAvatarUrl } = useMyProfile();
  const { members } = useWalletMembers();

  const memberByUserId = useMemo(() => {
    const map = new Map<string, { displayName: string | null; avatarUrl: string | null }>();
    for (const m of members) {
      map.set(m.userId, { displayName: m.displayName, avatarUrl: m.avatarUrl });
    }
    return map;
  }, [members]);

  // Cache resolved creators per userId so callers receive stable references.
  // Without this, every render produces fresh `{ displayName, avatarUrl, isMe }`
  // objects and downstream `React.memo`'d rows (e.g. TransactionRow) cannot bail
  // out of re-rendering.
  return useMemo(() => {
    const cache = new Map<string, TransactionRowCreator>();
    const meCreator: TransactionRowCreator = {
      displayName: myDisplayName,
      avatarUrl: myAvatarUrl,
      isMe: true,
    };
    return (userId: string | null): TransactionRowCreator | null => {
      if (!userId) return null;

      if (userId === myUserId || userId === DEMO_USER_SELF) {
        return meCreator;
      }

      const cached = cache.get(userId);
      if (cached) return cached;

      const member = memberByUserId.get(userId);
      const creator: TransactionRowCreator = member
        ? { displayName: member.displayName, avatarUrl: member.avatarUrl, isMe: false }
        : userId === DEMO_USER_PARTNER
          ? { displayName: 'Parceiro', avatarUrl: null, isMe: false }
          : { displayName: null, avatarUrl: null, isMe: false };
      cache.set(userId, creator);
      return creator;
    };
  }, [myUserId, myDisplayName, myAvatarUrl, memberByUserId]);
}
