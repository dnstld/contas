import { Platform, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import * as Compose from '@expo/ui/jetpack-compose';
import * as SwiftUI from '@expo/ui/swift-ui';
import {
  accessibilityValue,
  buttonStyle,
  controlSize,
  disabled as disabledMod,
  fixedSize,
  foregroundStyle,
  labelStyle,
  tint as tintMod,
} from '@expo/ui/swift-ui/modifiers';

import { Colors } from '@/constants/theme';
import { useThemeColor } from '@/hooks/use-theme-color';

export type ChipVariant = 'primary' | 'secondary' | 'tertiary' | 'default';

/** SF Symbol name accepted by the underlying iOS button. */
export type ChipSystemImage = Parameters<typeof SwiftUI.Button>[0]['systemImage'];

// Android's native chip can't render an SF Symbol; fall back to a compact glyph
// prefix (mirroring how the selected checkmark degrades to "✓"). Extend as new
// icons are used on chips.
const ANDROID_GLYPH: Partial<Record<string, string>> = {
  'lock.fill': '🔒',
};

export interface ChipProps {
  label: string;
  onPress?: () => void;
  selected?: boolean;
  variant?: ChipVariant;
  showCheckWhenSelected?: boolean;
  disabled?: boolean;
  /** Tint the label/foreground with the variant color on a glass background (an
   * action accent), distinct from the filled look of a selected chip. */
  accent?: boolean;
  /** Optional leading icon (SF Symbol on iOS, glyph fallback on Android). A
   * selected chip's checkmark takes precedence when `showCheckWhenSelected`. */
  systemImage?: ChipSystemImage;
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
  accent = false,
  systemImage,
}: ChipProps) {
  const { t } = useTranslation();
  const tone = useThemeColor({}, VARIANT_TONE[variant]);
  const textColor = useThemeColor({}, 'text');
  const onPrimary = useThemeColor({}, 'onPrimary');
  // Selected → filled tint with onPrimary label. Accent → glass with the
  // variant color as the label/foreground. Otherwise → neutral glass.
  const labelColor = selected ? onPrimary : accent ? tone : textColor;

  if (Platform.OS === 'ios') {
    return (
      <SwiftUI.Host matchContents style={styles.host}>
        <SwiftUI.Button
          label={label}
          systemImage={selected && showCheckWhenSelected ? 'checkmark' : systemImage}
          onPress={disabled ? undefined : onPress}
          modifiers={[
            buttonStyle(selected ? 'glassProminent' : 'glass'),
            controlSize('small'),
            tintMod(tone),
            foregroundStyle(labelColor),
            labelStyle('titleAndIcon'),
            disabledMod(!!disabled),
            accessibilityValue(
              selected ? t('accessibility.state.selected') : t('accessibility.state.notSelected'),
            ),
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
            containerColor: accent ? `${tone}1A` : undefined,
            labelColor: accent ? tone : undefined,
            selectedContainerColor: tone,
            selectedLabelColor: onPrimary,
            selectedLeadingIconColor: onPrimary,
          }}
        >
          <Compose.FilterChip.Label>
            {selected && showCheckWhenSelected
              ? `✓  ${label}`
              : systemImage && ANDROID_GLYPH[systemImage]
                ? `${ANDROID_GLYPH[systemImage]}  ${label}`
                : label}
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
