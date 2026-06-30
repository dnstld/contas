import { Image, type ImageStyle } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AvatarBadge, type AvatarBadgeVariant } from '@/components/ui/atoms/avatar-badge';
import { Icon, type IconName } from '@/components/ui/atoms/icon';
import { Surface } from '@/components/ui/atoms/surface';
import { Text, type TextVariant } from '@/components/ui/atoms/text';
import { Colors } from '@/constants/theme';

/** Shared size scale for the avatar and its corner badge. */
export type AvatarSize = 'sm' | 'md' | 'lg';

/** Square edge length (px) for each avatar size. */
export const AVATAR_DIMENSIONS: Record<AvatarSize, number> = {
  sm: 36,
  md: 40,
  lg: 56,
};

export interface AvatarProps {
  /** Remote image URL. Falls back to initials when null/undefined. */
  url?: string | null;
  /** Display name used to derive initials when no URL is provided. */
  name?: string | null;
  /** Explicit initials override. Wins over `name`. */
  initials?: string;
  /** Size variant. Defaults to `md`. */
  size?: AvatarSize;
  /** Optional corner badge; sized to match the avatar automatically. */
  badge?: AvatarBadgeVariant;
  /** Renders an icon (centered) instead of initials, when no `url` is set. */
  icon?: IconName;
  /** Color token for the `icon`. Defaults to `icon`. */
  iconTone?: keyof typeof Colors.light;
  /** Background tone token for the fallback circle. Defaults to the muted surface. */
  tone?: keyof typeof Colors.light;
  style?: StyleProp<ViewStyle>;
}

function deriveInitials(name: string | null | undefined): string {
  if (!name) return '?';
  const cleaned = name.replace(/[^\p{L}\p{N}\s]/gu, '').trim();
  if (!cleaned) return '?';
  const words = cleaned.split(/\s+/);
  if (words.length === 1) {
    return (words[0] ?? '').slice(0, 2).toUpperCase() || '?';
  }
  const first = words[0]?.[0] ?? '';
  const last = words[words.length - 1]?.[0] ?? '';
  return (first + last).toUpperCase() || '?';
}

function pickTextVariant(dimension: number): TextVariant {
  if (dimension >= 44) return 'subtitle';
  return 'caption';
}

export function Avatar({
  url,
  name,
  initials,
  size = 'md',
  badge,
  icon,
  iconTone = 'icon',
  tone,
  style,
}: AvatarProps) {
  const dimension = AVATAR_DIMENSIONS[size];
  const radius = Math.round(dimension / 2);

  const visual = url ? (
    <Image
      source={{ uri: url }}
      // Avatars render in recycled transaction rows; `recyclingKey` ties the
      // decoded image to its uri so a recycled row doesn't briefly show the
      // previous occupant's avatar before re-decoding.
      cachePolicy="memory-disk"
      recyclingKey={url}
      transition={120}
      style={[
        { width: dimension, height: dimension, borderRadius: radius },
        !badge ? (style as StyleProp<ImageStyle>) : null,
      ]}
    />
  ) : (
    <Surface
      variant="muted"
      tone={tone}
      padding={0}
      radius={radius}
      style={[styles.fallback, { width: dimension, height: dimension }, !badge ? style : null]}
    >
      {icon ? (
        <Icon name={icon} size={Math.round(dimension * 0.5)} tone={iconTone} />
      ) : (
        <Text variant={pickTextVariant(dimension)} weight="semibold">
          {initials ?? deriveInitials(name)}
        </Text>
      )}
    </Surface>
  );

  if (!badge) return visual;

  return (
    <View style={style}>
      {visual}
      <AvatarBadge variant={badge} size={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
