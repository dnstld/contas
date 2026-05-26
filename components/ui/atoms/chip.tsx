import { Platform, StyleSheet } from 'react-native';

import * as Compose from '@expo/ui/jetpack-compose';
import * as SwiftUI from '@expo/ui/swift-ui';
import {
  buttonStyle,
  controlSize,
  fixedSize,
  foregroundStyle,
  labelStyle,
  tint as tintMod,
} from '@expo/ui/swift-ui/modifiers';

import { Colors } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ChipVariant = 'primary' | 'secondary' | 'tertiary' | 'default';

export interface ChipProps {
  label: string;
  onPress?: () => void;
  selected?: boolean;
  variant?: ChipVariant;
  showCheckWhenSelected?: boolean;
  disabled?: boolean;
}

const VARIANT_TONE: Record<ChipVariant, keyof typeof Colors.light> = {
  primary: 'tint',
  secondary: 'secondary',
  tertiary: 'icon',
  default: 'textMuted',
};

export function Chip({
  label,
  onPress,
  selected = false,
  variant = 'default',
  showCheckWhenSelected = false,
  disabled,
}: ChipProps) {
  const tone = useThemeColor({}, VARIANT_TONE[variant]);
  const labelColor = useThemeColor({}, selected ? 'onPrimary' : 'text');

  if (Platform.OS === 'ios') {
    return (
      <SwiftUI.Host matchContents style={styles.host}>
        <SwiftUI.Button
          label={label}
          systemImage={selected && showCheckWhenSelected ? 'checkmark' : undefined}
          onPress={onPress}
          modifiers={[
            buttonStyle(selected ? 'glassProminent' : 'glass'),
            controlSize('small'),
            tintMod(tone),
            foregroundStyle(labelColor),
            labelStyle('titleAndIcon'),
            fixedSize(),
          ]}
        />
      </SwiftUI.Host>
    );
  }

  if (Platform.OS === 'android') {
    return (
      <Compose.Host matchContents>
        <Compose.FilterChip
          selected={selected}
          enabled={!disabled}
          onClick={onPress}
          colors={{
            selectedContainerColor: tone,
            selectedLabelColor: labelColor,
            selectedLeadingIconColor: labelColor,
          }}
        >
          <Compose.FilterChip.Label>
            {selected && showCheckWhenSelected ? `✓  ${label}` : label}
          </Compose.FilterChip.Label>
        </Compose.FilterChip>
      </Compose.Host>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  host: { minHeight: 32 },
});
