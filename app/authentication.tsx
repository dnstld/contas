import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function AuthenticationScreen() {
  const { t } = useTranslation();
  const { signInWithGoogle } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const background = useThemeColor({}, 'background');

  const onPress = async () => {
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      console.error('[auth] Google sign-in failed', e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: background }]}>
      <View style={styles.copy}>
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
