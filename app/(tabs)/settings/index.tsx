import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';

import {
  Button,
  SettingsRow,
  SettingsSection,
  SortMenu,
  Text,
  Toggle,
} from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import { useCurrency, type SupportedCurrency } from '@/hooks/use-currency';
import { useLanguage } from '@/hooks/use-language';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { useThemeColor } from '@/hooks/use-theme-color';
import { type SupportedLanguage } from '@/i18n';

export default function SettingsScreen() {
  const background = useThemeColor({}, 'background');
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const { language, setLanguage, supported } = useLanguage();
  const {
    currency,
    setCurrency,
    supported: supportedCurrencies,
  } = useCurrency();
  const [revenueVisible, setRevenueVisible] = usePersistedState(
    'dashboard:revenue-visible',
    false,
  );
  const [demoMode, setDemoMode] = usePersistedState(
    'settings:demo-mode',
    false,
  );

  const languageOptions = useMemo(
    () =>
      supported.map((code) => ({
        value: code,
        label: t(`settings.languages.${code}`),
      })),
    [supported, t],
  );

  const currencyOptions = useMemo(
    () =>
      supportedCurrencies.map((code) => ({
        value: code,
        label: t(`settings.currencies.${code}`),
      })),
    [supportedCurrencies, t],
  );

  return (
    <ScrollView
      style={{ backgroundColor: background }}
      contentContainerStyle={styles.content}
    >
      <Text variant="display" weight="bold">
        {t('settings.title')}
      </Text>

      <SettingsSection title={t('settings.sections.display')}>
        <SettingsRow
          title={t('settings.revenueVisible.title')}
          description={t('settings.revenueVisible.description')}
          trailing={
            <Toggle value={revenueVisible} onValueChange={setRevenueVisible} />
          }
        />
        <SettingsRow
          title={t('settings.demoMode.title')}
          description={t('settings.demoMode.description')}
          trailing={<Toggle value={demoMode} onValueChange={setDemoMode} />}
        />
      </SettingsSection>

      <SettingsSection title={t('settings.sections.regional')}>
        <SettingsRow
          title={t('settings.languageRow.title')}
          trailing={
            <SortMenu<SupportedLanguage>
              options={languageOptions}
              value={language}
              onChange={setLanguage}
            />
          }
        />
        <SettingsRow
          title={t('settings.currencyRow.title')}
          trailing={
            <SortMenu<SupportedCurrency>
              options={currencyOptions}
              value={currency}
              onChange={setCurrency}
            />
          }
        />
      </SettingsSection>

      <SettingsSection title={t('settings.sections.account')}>
        <SettingsRow
          title={t('settings.signOutRow.title')}
          description={t('settings.signOutRow.description')}
          trailing={
            <Button
              label={t('auth.signOut')}
              onPress={signOut}
              variant="destructive"
              size="small"
            />
          }
        />
      </SettingsSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 64,
    gap: 24,
  },
});
