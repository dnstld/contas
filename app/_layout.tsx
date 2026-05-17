import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";

import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useFinanceRealtime, useWalletRealtime } from "@/hooks/use-finance-realtime";
import { FinanceQueryProvider } from "@/hooks/use-query-client";
import { WalletProvider, useWallet } from "@/hooks/use-wallet";
import { initI18n } from "@/i18n";

function RootStack() {
  const { session, loading: authLoading } = useAuth();
  const { loading: walletLoading } = useWallet();
  const segments = useSegments();
  const router = useRouter();

  useFinanceRealtime();
  useWalletRealtime();

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
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="authentication" options={{ headerShown: false }} />
      <Stack.Screen name="(modals)" options={{ presentation: 'modal', headerShown: false }} />
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
