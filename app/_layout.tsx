import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ErrorFallback } from '@/components/error-fallback';
import { ROUTES, redeemCodeHref } from '@/constants/routes';
import { setPendingInvitation, takePendingInvitation } from '@/utils/pending-invitation';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFinanceRealtime, useWalletRealtime } from '@/hooks/use-finance-realtime';
import {
  FinanceQueryProvider,
  useAppStateInvalidate,
  useClearCacheOnSignOut,
} from '@/hooks/use-query-client';
import { WalletProvider, useWallet } from '@/hooks/use-wallet';
import { initI18n } from '@/i18n';
import { ErrorBoundary, initMonitoring, wrap } from '@/utils/monitoring';

initMonitoring();

SplashScreen.preventAutoHideAsync().catch(() => {});

function RootStack() {
  const { session, loading: authLoading } = useAuth();
  const { loading: walletLoading } = useWallet();
  const segments = useSegments();
  const router = useRouter();
  const url = Linking.useURL();
  const pendingHandledRef = useRef(false);

  useFinanceRealtime();
  useWalletRealtime();
  useAppStateInvalidate();
  useClearCacheOnSignOut();

  const booting = authLoading || (!!session && walletLoading);

  // A `redeem-code` deep link that lands while signed out would lose its
  // `?code=` param when the auth gate redirects to sign-in. Stash it so we
  // can replay it once a session exists.
  useEffect(() => {
    if (!url || session) return;
    const { queryParams } = Linking.parse(url);
    const code = typeof queryParams?.code === 'string' ? queryParams.code : null;
    if (code && url.includes('redeem-code')) setPendingInvitation(code);
  }, [url, session]);

  useEffect(() => {
    if (booting) return;
    const inAuthRoute = segments[0] === 'authentication';
    if (!session && !inAuthRoute) {
      router.replace(ROUTES.authentication);
    } else if (session && inAuthRoute) {
      router.replace(ROUTES.home);
    }
  }, [session, booting, segments, router]);

  // Once signed in, replay any invite code captured while signed out.
  useEffect(() => {
    if (booting || !session || pendingHandledRef.current) return;
    pendingHandledRef.current = true;
    takePendingInvitation().then((code) => {
      if (code) router.push(redeemCodeHref(code));
    });
  }, [booting, session, router]);

  const onRootLayout = useCallback(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  if (booting) return null;

  return (
    <View style={{ flex: 1 }} onLayout={onRootLayout}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="authentication" />
        <Stack.Screen name="(modals)" options={{ presentation: 'modal', headerShown: false }} />
      </Stack>
    </View>
  );
}

function RootLayout() {
  const colorScheme = useColorScheme();
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    initI18n().then(() => {
      if (!cancelled) setI18nReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!i18nReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary fallback={({ resetError }) => <ErrorFallback onReset={resetError} />}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <AuthProvider>
            <FinanceQueryProvider>
              <WalletProvider>
                <RootStack />
              </WalletProvider>
            </FinanceQueryProvider>
          </AuthProvider>
          <StatusBar style="light" />
        </ThemeProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

export default wrap(RootLayout);
