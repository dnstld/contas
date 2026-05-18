import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { captureError, captureMessage, setMonitoringUser } from '@/utils/monitoring';
import { supabase } from '@/utils/supabase';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID!,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
});

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        setMonitoringUser({
          id: data.session.user.id,
          email: data.session.user.email ?? undefined,
        });
      }
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      if (next) {
        setMonitoringUser({ id: next.user.id, email: next.user.email ?? undefined });
      } else {
        setMonitoringUser(null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      async signInWithGoogle() {
        try {
          await GoogleSignin.hasPlayServices();
          const res = await GoogleSignin.signIn();
          const idToken = res.data?.idToken;
          if (!idToken) throw new Error('No idToken returned from Google');
          const { data, error } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: idToken,
          });
          if (error) throw error;
          if (!data.session) {
            captureMessage('signInWithIdToken returned no session', 'error', {
              tags: { context: 'auth' },
            });
            throw new Error('No session returned');
          }
        } catch (err) {
          const code = (err as { code?: string } | null)?.code;
          if (code !== statusCodes.SIGN_IN_CANCELLED && code !== statusCodes.IN_PROGRESS) {
            captureError(err, { tags: { context: 'auth' } });
          }
          throw err;
        }
      },
      async signOut() {
        try {
          await GoogleSignin.signOut();
        } catch {
          // user wasn't signed into Google natively — ignore
        }
        await supabase.auth.signOut();
      },
    }),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

export { statusCodes };
