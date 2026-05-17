import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/utils/supabase';

export const myProfileKey = (userId: string) => ['my-profile', userId] as const;

export function useMyProfile() {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;

  const query = useQuery({
    queryKey: myProfileKey(userId ?? ''),
    enabled: !!userId,
    refetchOnMount: 'always',
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
