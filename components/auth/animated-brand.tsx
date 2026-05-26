import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/ui';

const HOLD_MS = 1600;
const SWAP_MS = 520;
const FLIP_OFFSET = 14;
const FLIP_DEG = 80;

export function AnimatedBrand() {
  const { t } = useTranslation();
  const brandPrefix = t('auth.welcome.brandPrefix');
  const brandTagline = t('auth.welcome.brandTagline');
  const taglineText = ` ${brandTagline}`;
  const numberText = ' 42';

  const [forTwoWidth, setForTwoWidth] = useState(0);
  const [fortyTwoWidth, setFortyTwoWidth] = useState(0);
  const ready = forTwoWidth > 0 && fortyTwoWidth > 0;

  useEffect(() => {
    setForTwoWidth(0);
    setFortyTwoWidth(0);
  }, [taglineText]);

  const progress = useSharedValue(0);

  useEffect(() => {
    if (!ready) return;
    progress.value = withDelay(
      HOLD_MS,
      withRepeat(
        withSequence(
          withTiming(1, { duration: SWAP_MS, easing: Easing.inOut(Easing.cubic) }),
          withDelay(HOLD_MS, withTiming(0, { duration: SWAP_MS, easing: Easing.inOut(Easing.cubic) })),
          withDelay(HOLD_MS, withTiming(0, { duration: 0 })),
        ),
        -1,
        false,
      ),
    );
  }, [ready, progress]);

  const containerStyle = useAnimatedStyle(() => ({
    width: interpolate(progress.value, [0, 1], [forTwoWidth, fortyTwoWidth]),
  }));

  const forTwoStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.45, 1], [1, 0, 0]),
    transform: [
      { perspective: 600 },
      { translateY: interpolate(progress.value, [0, 1], [0, -FLIP_OFFSET]) },
      { rotateX: `${interpolate(progress.value, [0, 1], [0, -FLIP_DEG])}deg` },
    ],
  }));

  const fortyTwoStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.55, 1], [0, 0, 1]),
    transform: [
      { perspective: 600 },
      { translateY: interpolate(progress.value, [0, 1], [FLIP_OFFSET, 0]) },
      { rotateX: `${interpolate(progress.value, [0, 1], [FLIP_DEG, 0])}deg` },
    ],
  }));

  const onForTwoLayout = (e: LayoutChangeEvent) => {
    if (!forTwoWidth) setForTwoWidth(e.nativeEvent.layout.width);
  };
  const onFortyTwoLayout = (e: LayoutChangeEvent) => {
    if (!fortyTwoWidth) setFortyTwoWidth(e.nativeEvent.layout.width);
  };

  return (
    <View style={styles.row}>
      <Text variant="display" weight="bold">
        {brandPrefix}
      </Text>

      <View
        style={styles.measureSlot}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Text variant="display" weight="bold" onLayout={onForTwoLayout}>
          {taglineText}
        </Text>
      </View>
      <View
        style={styles.measureSlot}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Text variant="display" weight="bold" onLayout={onFortyTwoLayout}>
          {numberText}
        </Text>
      </View>

      {ready ? (
        <Animated.View
          style={[styles.swap, containerStyle]}
          accessibilityRole="header"
          accessibilityLabel={`${brandPrefix} 42`}
        >
          <Animated.View
            style={[styles.layer, { width: forTwoWidth }, forTwoStyle]}
            pointerEvents="none"
          >
            <Text variant="display" weight="bold">
              {taglineText}
            </Text>
          </Animated.View>
          <Animated.View
            style={[styles.layer, { width: fortyTwoWidth }, fortyTwoStyle]}
            pointerEvents="none"
          >
            <Text variant="display" weight="bold">
              {numberText}
            </Text>
          </Animated.View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  swap: {
    height: 40,
  },
  layer: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  measureSlot: {
    position: 'absolute',
    left: -9999,
    top: -9999,
    width: 9999,
    flexDirection: 'row',
    opacity: 0,
  },
});
