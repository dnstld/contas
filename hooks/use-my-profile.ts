import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/hooks/use-auth';
import { useWallet } from '@/hooks/use-wallet';
import { walletMemberKeys } from '@/hooks/use-wallet-members';
import { supabase } from '@/utils/supabase';

export const myProfileKey = (userId: string) => ['my-profile', userId] as const;

export function useMyProfile() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;

  const query = useQuery({
    queryKey: myProfileKey(userId ?? ''),
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .eq('id', userId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  return {
    displayName: query.data?.display_name ?? null,
    avatarUrl: query.data?.avatar_url ?? null,
    isLoading: query.isLoading,
  };
}

export function useUpdateMyProfile() {
  const { session } = useAuth();
  const { walletId } = useWallet();
  const qc = useQueryClient();
  const userId = session?.user.id ?? null;

  return useMutation({
    mutationFn: async ({ displayName }: { displayName: string }) => {
      const trimmed = displayName.trim();
      if (!trimmed) throw new Error('displayName is required');

      const [authResult, profileResult] = await Promise.all([
        supabase.auth.updateUser({ data: { full_name: trimmed } }),
        userId
          ? supabase.from('profiles').update({ display_name: trimmed }).eq('id', userId)
          : Promise.resolve({ error: null }),
      ]);

      if (authResult.error) throw authResult.error;
      if (profileResult.error) throw profileResult.error;
      return trimmed;
    },
    onSuccess: () => {
      if (userId) qc.invalidateQueries({ queryKey: myProfileKey(userId) });
      if (walletId) qc.invalidateQueries({ queryKey: walletMemberKeys.list(walletId) });
    },
  });
}
