import type { ParamListBase, StackNavigationState } from '@react-navigation/native';
import { withLayoutContext } from 'expo-router';
import type { ComponentProps } from 'react';
import { Platform } from 'react-native';
import {
  createBlankStackNavigator,
  type BlankStackNavigationEventMap,
  type BlankStackNavigationOptions,
} from 'react-native-screen-transitions/blank-stack';

const { Navigator } = createBlankStackNavigator();

function BlankStackNavigator(props: ComponentProps<typeof Navigator>) {
  const enableNativeScreens = props.enableNativeScreens ?? Platform.OS === 'ios';
  return <Navigator {...props} enableNativeScreens={enableNativeScreens} />;
}

export const ModalStack = withLayoutContext<
  BlankStackNavigationOptions,
  typeof BlankStackNavigator,
  StackNavigationState<ParamListBase>,
  BlankStackNavigationEventMap
>(BlankStackNavigator);
