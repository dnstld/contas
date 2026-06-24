import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/atoms/text';
import { Logo } from '@/components/ui/molecules/logo';

import type { NotificationBannerProps } from './types';

export const NotificationBanner = React.memo<NotificationBannerProps>(({
  title,
  subtitle,
  showIllustration = true,
  testID,
}) => {
  return (
    <View
      style={styles.container}
      testID={testID}
      accessible
      accessibilityRole="alert"
      accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
    >
      {showIllustration && (
        <View style={styles.illustration}>
          <Logo size="small" />
        </View>
      )}

      <View style={styles.content}>
        <Text variant="subtitle" weight="bold" numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="body" numberOfLines={3}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
});

NotificationBanner.displayName = 'NotificationBanner';

export default NotificationBanner;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  illustration: {
    // The logo SVG carries ~10-12px of transparent whitespace on its left and
    // right; crop it so the illustration sits flush with the banner padding/text.
    marginLeft: -10,
    marginRight: -8,
  },
  content: {
    flex: 1,
    gap: 4,
  },
});
