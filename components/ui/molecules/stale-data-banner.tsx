import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/atoms/icon';
import { Text } from '@/components/ui/atoms/text';
import { useThemeColor } from '@/hooks/use-theme-color';

export interface StaleDataBannerProps {
  messageKey: string;
  onRetry: () => void;
}

export function StaleDataBanner({ messageKey, onRetry }: StaleDataBannerProps) {
  const { t } = useTranslation();
  const background = useThemeColor({}, 'surfaceMuted');
  const border = useThemeColor({}, 'border');
  const iconColor = useThemeColor({}, 'negative');
  const accessibilityLabel = `${t('common.errors.staleTitle')}. ${t(messageKey)}`;

  return (
    <Pressable
      onPress={onRetry}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={t('common.errors.staleRetry')}
      accessibilityLiveRegion="polite"
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: background, borderColor: border, opacity: pressed ? 0.7 : 1 },
      ]}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Icon name="exclamationmark.triangle.fill" size={18} color={iconColor} />
      <View style={styles.text}>
        <Text variant="caption" weight="semibold">
          {t('common.errors.staleTitle')}
        </Text>
        <Text variant="caption" tone="textMuted">
          {t(messageKey)} · {t('common.errors.staleRetry')}
        </Text>
      </View>
      <Icon name="arrow.clockwise" size={16} tone="textMuted" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: {
    flex: 1,
    gap: 2,
  },
});
