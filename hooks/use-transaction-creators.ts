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

  return useMemo(() => {
    return (userId: string | null): TransactionRowCreator | null => {
      if (!userId) return null;

      const isMe = userId === myUserId || userId === DEMO_USER_SELF;
      if (isMe) {
        return { displayName: myDisplayName, avatarUrl: myAvatarUrl, isMe: true };
      }

      const member = memberByUserId.get(userId);
      if (member) {
        return { displayName: member.displayName, avatarUrl: member.avatarUrl, isMe: false };
      }

      if (userId === DEMO_USER_PARTNER) {
        return { displayName: 'Parceiro', avatarUrl: null, isMe: false };
      }

      return { displayName: null, avatarUrl: null, isMe: false };
    };
  }, [myUserId, myDisplayName, myAvatarUrl, memberByUserId]);
}
