import type {
  ParamListBase,
  StackNavigationState,
} from "@react-navigation/native";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { withLayoutContext } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import Transition from "react-native-screen-transitions";
import {
  createBlankStackNavigator,
  type BlankStackNavigationEventMap,
  type BlankStackNavigationOptions,
} from "react-native-screen-transitions/blank-stack";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { initI18n } from "@/i18n";
import { interpolate } from "react-native-reanimated";

const { Navigator } = createBlankStackNavigator();

const Stack = withLayoutContext<
  BlankStackNavigationOptions,
  typeof Navigator,
  StackNavigationState<ParamListBase>,
  BlankStackNavigationEventMap
>(Navigator);

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
      <Stack>
        <Stack.Screen name="(tabs)" options={{}} />
        <Stack.Screen
          name="(modals)"
          options={{
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
          }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
