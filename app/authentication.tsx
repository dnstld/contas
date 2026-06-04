import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { statusCodes, useAuth } from '@/hooks/use-auth';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getErrorCode } from '@/utils/error';

const ERROR_KEYS: Record<string, string> = {
  [statusCodes.PLAY_SERVICES_NOT_AVAILABLE]: 'auth.errors.playServices',
  [statusCodes.SIGN_IN_REQUIRED]: 'auth.errors.signInRequired',
};

export default function AuthenticationScreen() {
  const { t } = useTranslation();
  const { signInWithGoogle } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const background = useThemeColor({}, 'background');

  const onPress = async () => {
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      const key = ERROR_KEYS[getErrorCode(err) ?? ''] ?? 'auth.errors.generic';
      Alert.alert(t('auth.errors.title'), t(key));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: background }]}>
      <View style={styles.copy}>
        <Text variant="caption" weight="semibold" tone="tint">
          kontadois
        </Text>
        <Text variant="display" weight="bold">
          {t('auth.welcome.title')}
        </Text>
        <Text variant="body" tone="textMuted">
          {t('auth.welcome.body')}
        </Text>
      </View>
      <Button
        label={t('auth.signInWithGoogle')}
        onPress={onPress}
        disabled={submitting}
        variant="primary"
        size="large"
        systemImage="arrow.right.circle.fill"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'stretch',
    gap: 32,
    padding: 24,
  },
  copy: {
    gap: 12,
    alignItems: 'flex-start',
  },
});
