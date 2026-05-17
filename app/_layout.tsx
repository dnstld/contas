import type {
  ParamListBase,
  StackNavigationState,
} from "@react-navigation/native";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useRouter, useSegments, withLayoutContext } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import Transition from "react-native-screen-transitions";
import {
  createBlankStackNavigator,
  type BlankStackNavigationEventMap,
  type BlankStackNavigationOptions,
} from "react-native-screen-transitions/blank-stack";

import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFinanceRealtime } from "@/hooks/use-finance-realtime";
import { FinanceQueryProvider } from "@/hooks/use-query-client";
import { WalletProvider, useWallet } from "@/hooks/use-wallet";
import { initI18n } from "@/i18n";
import { interpolate } from "react-native-reanimated";

const { Navigator } = createBlankStackNavigator();

const Stack = withLayoutContext<
  BlankStackNavigationOptions,
  typeof Navigator,
  StackNavigationState<ParamListBase>,
  BlankStackNavigationEventMap
>(Navigator);

const modalScreenOptions: BlankStackNavigationOptions = {
  ...Transition.Presets.SlideFromBottom(),
  gestureDirection: "vertical",
  screenStyleInterpolator: ({ progress, current, insets }) => {
    "worklet";

    const scale = interpolate(
      progress,
      [0, 1, 2],
      [0.95, 1, 1.05],
      "clamp",
    );
    const translateY = interpolate(
      progress,
      [0, 1, 2],
      [current.layouts.screen.height, 0, insets.top - 14],
      "clamp",
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
        backgroundColor: "transparent",
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

  const booting = authLoading || (!!session && walletLoading);

  useEffect(() => {
    if (booting) return;
    const inAuthRoute = segments[0] === "authentication";
    if (!session && !inAuthRoute) {
      router.replace("/authentication");
    } else if (session && inAuthRoute) {
      router.replace("/(tabs)/(status)");
    }
  }, [session, booting, segments, router]);

  if (booting) return null;

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{}} />
      <Stack.Screen name="authentication" options={{}} />
      <Stack.Screen name="(modals)" options={modalScreenOptions} />
    </Stack>
  );
}

export default function RootLayout() {
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
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <FinanceQueryProvider>
          <WalletProvider>
            <RootStack />
          </WalletProvider>
        </FinanceQueryProvider>
      </AuthProvider>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
