import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import { ErrorFallback } from '@/components/error-fallback';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  useActiveWalletReconciler,
  useFinanceRealtime,
  useWalletRealtime,
} from '@/hooks/use-finance-realtime';
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

export const unstable_settings = { anchor: '(tabs)' };

function RootStack() {
  const { session, loading: authLoading } = useAuth();
  const { loading: walletLoading, error: walletError, walletId, refresh } = useWallet();

  useFinanceRealtime();
  useWalletRealtime();
  useActiveWalletReconciler();
  useAppStateInvalidate();
  useClearCacheOnSignOut();

  const booting = authLoading || (!!session && walletLoading);

  const onRootLayout = useCallback(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  if (booting) return null;

  // Wallet resolution failed and there's no wallet to render — show a retry
  // screen instead of empty tabs. `refresh()` → `resolve()` sets `error:null`
  // and re-attempts.
  if (session && walletError && !walletId) {
    return (
      <View style={{ flex: 1 }} onLayout={onRootLayout}>
        <ErrorFallback onReset={() => void refresh()} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }} onLayout={onRootLayout}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(modals)" options={{ presentation: 'modal', headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="authentication" />
        </Stack.Protected>
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
      <KeyboardProvider>
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
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

export default wrap(RootLayout);
