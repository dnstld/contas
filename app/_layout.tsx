import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { interpolate } from 'react-native-reanimated';
import Transition from 'react-native-screen-transitions';

import type { BlankStackNavigationOptions } from 'react-native-screen-transitions/blank-stack';

import { ErrorFallback } from '@/components/error-fallback';
import { ModalStack } from '@/components/navigation/modal-stack';
import { MODAL_SNAP } from '@/constants/modal';
import { ROUTES } from '@/constants/routes';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFinanceRealtime, useWalletRealtime } from '@/hooks/use-finance-realtime';
import { FinanceQueryProvider, useAppStateInvalidate } from '@/hooks/use-query-client';
import { WalletProvider, useWallet } from '@/hooks/use-wallet';
import { initI18n } from '@/i18n';
import { ErrorBoundary, initMonitoring, wrap } from '@/utils/monitoring';

initMonitoring();

const modalScreenOptions: BlankStackNavigationOptions = {
  ...Transition.Presets.SlideFromBottom(),
  gestureDirection: 'vertical',
  snapPoints: [MODAL_SNAP, 1],
  initialSnapIndex: 0,
  gestureSnapLocked: true,
  backdropBehavior: 'dismiss',
  screenStyleInterpolator: ({ progress, current, insets }) => {
    'worklet';
    const scale = interpolate(progress, [0, 1, 2], [0.95, 1, 1.05], 'clamp');
    const translateY = interpolate(
      progress,
      [0, 1, 2],
      [current.layouts.screen.height, 0, insets.top - 14],
      'clamp',
    );
    return {
      content: {
        style: {
          opacity: interpolate(progress, [0, 1, 2], [0, 1, 0]),
          transform: [{ translateY }, { scale }],
        },
      },
      backdrop: {
        opacity: 0,
        backgroundColor: 'transparent',
      },
    };
  },
  transitionSpec: {
    open: Transition.Specs.DefaultSpec,
    close: Transition.Specs.DefaultSpec,
  },
};

function RootStack() {
  const { session, loading: authLoading } = useAuth();
  const { loading: walletLoading } = useWallet();
  const segments = useSegments();
  const router = useRouter();

  useFinanceRealtime();
  useWalletRealtime();
  useAppStateInvalidate();

  const booting = authLoading || (!!session && walletLoading);

  useEffect(() => {
    if (booting) return;
    const inAuthRoute = segments[0] === 'authentication';
    if (!session && !inAuthRoute) {
      router.replace(ROUTES.authentication);
    } else if (session && inAuthRoute) {
      router.replace(ROUTES.home);
    }
  }, [session, booting, segments, router]);

  if (booting) return null;

  return (
    <ModalStack>
      <ModalStack.Screen name="(tabs)" />
      <ModalStack.Screen name="authentication" />
      <ModalStack.Screen name="create" options={modalScreenOptions} />
      <ModalStack.Screen
        name="edit"
        dangerouslySingular={(_name, params) => (params as { id?: string } | undefined)?.id}
        options={modalScreenOptions}
      />
      <ModalStack.Screen name="category/[id]" options={modalScreenOptions} />
      <ModalStack.Screen
        name="category-form"
        dangerouslySingular={(_name, params) => (params as { editId?: string } | undefined)?.editId}
        options={modalScreenOptions}
      />
      <ModalStack.Screen name="edit-display-name" options={modalScreenOptions} />
      <ModalStack.Screen name="redeem-code" options={modalScreenOptions} />
      <ModalStack.Screen name="wallets" options={modalScreenOptions} />
    </ModalStack>
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
          <StatusBar style="auto" />
        </ThemeProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}

export default wrap(RootLayout);
