import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  SettingsRow,
  SettingsSection,
  SortMenu,
  Surface,
  Text,
  Toggle,
} from '@/components/ui';
import { EditDisplayNameModal } from '@/components/settings/edit-display-name-modal';
import { useAuth } from '@/hooks/use-auth';
import { useCurrency, type SupportedCurrency } from '@/hooks/use-currency';
import { useLanguage } from '@/hooks/use-language';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { useThemeColor } from '@/hooks/use-theme-color';
import { type SupportedLanguage } from '@/i18n';

function userInitials(name: string | null): string {
  if (!name) return '?';
  const words = name.trim().split(/\s+/);
  const first = words[0]?.[0] ?? '';
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

export default function SettingsScreen() {
  const background = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'border');
  const mutedColor = useThemeColor({}, 'textMuted');
  const dangerColor = useThemeColor({}, 'negative');
  const { t } = useTranslation();
  const { signOut, session } = useAuth();

  const avatarUrl = session?.user?.user_metadata?.avatar_url ?? null;
  const displayName = session?.user?.user_metadata?.full_name ?? null;
  const email = session?.user?.email ?? null;

  const [editNameVisible, setEditNameVisible] = useState(false);

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
    <>
      <ScrollView
        style={{ backgroundColor: background }}
        contentContainerStyle={styles.content}
      >
        <Surface variant="muted" padding={16} radius={16} style={styles.profileCard}>
          <View style={styles.profileTop}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <Surface variant="elevated" padding={0} radius={22} style={[styles.avatar, styles.avatarFallback]}>
                <Text variant="subtitle" weight="semibold">
                  {userInitials(displayName)}
                </Text>
              </Surface>
            )}
            <View style={styles.profileText}>
              <Text variant="subtitle" weight="semibold" numberOfLines={1}>
                {displayName ?? email}
              </Text>
              {displayName && email ? (
                <Text variant="caption" tone="textMuted" numberOfLines={1}>
                  {email}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.profileActions}>
            <Pressable
              onPress={() => setEditNameVisible(true)}
              style={({ pressed }) => [
                styles.actionBtn,
                { borderColor, opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Text variant="caption" weight="medium" style={{ color: mutedColor }}>
                {t('profile.actions.editName')}
              </Text>
            </Pressable>
            <Pressable
              onPress={signOut}
              style={({ pressed }) => [
                styles.actionBtn,
                { borderColor: dangerColor, opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Text variant="caption" weight="medium" style={{ color: dangerColor }}>
                {t('profile.actions.signOut')}
              </Text>
            </Pressable>
          </View>
        </Surface>

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
      </ScrollView>

      <EditDisplayNameModal
        visible={editNameVisible}
        currentName={displayName}
        onClose={() => setEditNameVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingTop: 16,
    paddingBottom: 64,
    gap: 24,
  },
  profileCard: {
    gap: 14,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileText: {
    flex: 1,
    gap: 2,
  },
  profileActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
