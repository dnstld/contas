import { Image, type ImageStyle } from 'expo-image';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { Surface } from '@/components/ui/atoms/surface';
import { Text, type TextVariant } from '@/components/ui/atoms/text';

export interface AvatarProps {
  /** Remote image URL. Falls back to initials when null/undefined. */
  url?: string | null;
  /** Display name used to derive initials when no URL is provided. */
  name?: string | null;
  /** Explicit initials override. Wins over `name`. */
  initials?: string;
  /** Square edge length in pixels. */
  size?: number;
  style?: StyleProp<ViewStyle>;
}

function deriveInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const cleaned = name
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .trim();
  if (!cleaned) return '?';
  const words = cleaned.split(/\s+/);
  if (words.length === 1) {
    return (words[0] ?? '').slice(0, 2).toUpperCase() || '?';
  }
  const first = words[0]?.[0] ?? '';
  const last = words[words.length - 1]?.[0] ?? '';
  return ((first + last).toUpperCase() || '?');
}

function pickTextVariant(size: number): TextVariant {
  if (size >= 44) return 'subtitle';
  return 'caption';
}

export function Avatar({ url, name, initials, size = 36, style }: AvatarProps) {
  const radius = Math.round(size / 2);

  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={[
          { width: size, height: size, borderRadius: radius },
          style as StyleProp<ImageStyle>,
        ]}
      />
    );
  }

  const label = initials ?? deriveInitials(name);
  return (
    <Surface
      variant="muted"
      padding={0}
      radius={radius}
      style={[styles.fallback, { width: size, height: size }, style]}
    >
      <Text variant={pickTextVariant(size)} weight="semibold">
        {label}
      </Text>
    </Surface>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
