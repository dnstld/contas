import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Laptop } from './svg/laptop';
import { LogoIllustration } from './svg/logo-illustration';
import type { LogoProps } from './types';
import { useLogo } from './use-logo';

export const Logo = React.memo<LogoProps>(({
  size = 'small',
  accessibilityLabel = 'Contas logo',
  testID,
}) => {
  const { illustrationWidth, laptopWidth } = useLogo({ size });

  return (
    <View
      style={styles.container}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      <LogoIllustration width={illustrationWidth} />
      <View style={styles.laptopContainer}>
        <Laptop width={laptopWidth} />
      </View>
    </View>
  );
});

Logo.displayName = 'Logo';

export default Logo;

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
  },
  laptopContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: 'center',
  },
});
