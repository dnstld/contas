import { ScrollView, StyleSheet } from 'react-native';

import {
  SettingsRow,
  SettingsSection,
  Text,
  Toggle,
} from '@/components/ui';
import { usePersistedState } from '@/hooks/use-persisted-state';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function SettingsScreen() {
  const background = useThemeColor({}, 'background');
  const [revenueVisible, setRevenueVisible] = usePersistedState(
    'dashboard:revenue-visible',
    false,
  );
  const [demoMode, setDemoMode] = usePersistedState(
    'settings:demo-mode',
    false,
  );

  return (
    <ScrollView
      style={{ backgroundColor: background }}
      contentContainerStyle={styles.content}
    >
      <Text variant="display" weight="bold">
        Ajustes
      </Text>

      <SettingsSection title="Exibição">
        <SettingsRow
          title="Mostrar receitas"
          description="Exibe os valores de receita no resumo financeiro."
          trailing={
            <Toggle value={revenueVisible} onValueChange={setRevenueVisible} />
          }
        />
        <SettingsRow
          title="Modo demo"
          description="Substitui todos os valores reais por dados de exemplo."
          trailing={<Toggle value={demoMode} onValueChange={setDemoMode} />}
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
