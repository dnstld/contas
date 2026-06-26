import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/hooks/use-auth';
import { useWallet } from '@/hooks/use-wallet';
import { walletKeys } from '@/hooks/use-wallet-list';
import { walletMemberKeys } from '@/hooks/use-wallet-members';
import { supabase } from '@/utils/supabase';

export type PendingInvitation = {
  id: string;
  walletId: string;
  walletName: string;
  inviterName: string | null;
  createdAt: string;
};

export const pendingInvitationKeys = {
  list: (email: string) => ['pending-invitations', email] as const,
};

export type OutgoingInvitation = {
  id: string;
  email: string;
  status: 'pending' | 'declined';
  createdAt: string;
};

export const outgoingInvitationKeys = {
  list: (walletId: string) => ['outgoing-invitations', walletId] as const,
};

/** Invites someone to the current wallet by email. */
export function useInviteToWallet() {
  const { walletId } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (email: string) => {
      if (!walletId) throw new Error('no wallet');
      const { data, error } = await supabase.rpc('invite_to_wallet', {
        p_wallet_id: walletId,
        p_email: email.trim().toLowerCase(),
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      if (walletId) {
        queryClient.invalidateQueries({ queryKey: outgoingInvitationKeys.list(walletId) });
      }
    },
  });
}

/**
 * Invitations the current wallet has sent: pending ones (the invitee hasn't
 * responded — accepting deletes the row) plus declined ones (kept so the
 * inviter sees the outcome and can re-invite or dismiss). Readable directly
 * thanks to the member-only RLS on `wallet_invitations`. Event-driven:
 * fetched on mount/focus, invalidated when an invite changes; never polled.
 */
export function useOutgoingInvitations() {
  const { walletId } = useWallet();

  return useQuery<OutgoingInvitation[]>({
    queryKey: outgoingInvitationKeys.list(walletId ?? ''),
    enabled: !!walletId,
    refetchOnMount: 'always',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallet_invitations')
        .select('id, invited_email, status, created_at, expires_at')
        .eq('wallet_id', walletId!)
        .not('invited_email', 'is', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const now = Date.now();
      return (data ?? [])
        // Pending invites disappear once expired; declined ones stick around
        // until the inviter dismisses them.
        .filter((row) => row.status === 'declined' || new Date(row.expires_at).getTime() > now)
        .map((row) => ({
          id: row.id,
          email: row.invited_email as string,
          status: row.status as OutgoingInvitation['status'],
          createdAt: row.created_at,
        }));
    },
  });
}

/**
 * Invitations addressed to the signed-in user's email. Event-driven: it
 * fetches on mount/focus and is invalidated by accept/decline and wallet
 * realtime, never polled.
 */
export function usePendingInvitations() {
  const { session } = useAuth();
  const email = session?.user.email ?? null;

  return useQuery<PendingInvitation[]>({
    queryKey: pendingInvitationKeys.list(email ?? ''),
    enabled: !!email,
    refetchOnMount: 'always',
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_pending_invitations');
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.id,
        walletId: row.wallet_id,
        walletName: row.wallet_name,
        inviterName: row.inviter_name,
        createdAt: row.created_at,
      }));
    },
  });
}

function useInvalidateInvitations() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id;
  const email = session?.user.email ?? '';

  return (joinedWalletId?: string) => {
    queryClient.invalidateQueries({ queryKey: pendingInvitationKeys.list(email) });
    if (userId) queryClient.invalidateQueries({ queryKey: walletKeys.list(userId) });
    if (joinedWalletId) {
      queryClient.invalidateQueries({ queryKey: walletMemberKeys.list(joinedWalletId) });
    }
  };
}

/** Accepts an invitation: joins the wallet and switches to it. */
export function useAcceptInvitation() {
  const { switchWallet } = useWallet();
  const invalidate = useInvalidateInvitations();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { data, error } = await supabase.rpc('accept_wallet_invitation', {
        p_invitation_id: invitationId,
      });
      if (error) throw error;
      return data as string; // joined wallet_id
    },
    onSuccess: (joinedWalletId) => {
      switchWallet(joinedWalletId);
      invalidate(joinedWalletId);
    },
  });
}

/** Declines an invitation (soft: the inviter still sees it as declined). */
export function useDeclineInvitation() {
  const invalidate = useInvalidateInvitations();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase.rpc('decline_wallet_invitation', {
        p_invitation_id: invitationId,
      });
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
  });
}

/**
 * Removes an outgoing invitation from the inviter's side — used to cancel a
 * pending invite or dismiss a declined one. Allowed by the member-only DELETE
 * RLS on `wallet_invitations`, so no RPC is needed.
 */
export function useCancelInvitation() {
  const { walletId } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('wallet_invitations')
        .delete()
        .eq('id', invitationId);
      if (error) throw error;
    },
    onSuccess: () => {
      if (walletId) {
        queryClient.invalidateQueries({ queryKey: outgoingInvitationKeys.list(walletId) });
      }
    },
  });
}
