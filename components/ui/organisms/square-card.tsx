import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/atoms/avatar';
import { type AvatarBadgeVariant } from '@/components/ui/atoms/avatar-badge';
import { Icon } from '@/components/ui/atoms/icon';
import { Skeleton } from '@/components/ui/atoms/skeleton';
import { Surface } from '@/components/ui/atoms/surface';
import { Text } from '@/components/ui/atoms/text';
import { useThemeColor } from '@/hooks/use-theme-color';

/** Fixed edge length shared by entity and add cards so rows stay aligned. */
export const SQUARE_CARD_SIZE = 116;

export interface SquareCardProps {
  /** Primary line (display name / wallet name). */
  name: string;
  /** Secondary line (email-replacement count, currency · members, …). */
  subtitle?: string | null;
  /** Remote avatar image. Falls back to initials from `avatarName ?? name`. */
  avatarUrl?: string | null;
  avatarName?: string | null;
  /** Highlights the card with a tint border (e.g. the active wallet). */
  active?: boolean;
  /**
   * Corner badge overlaid on the avatar.
   * - `edit` → pencil, signalling the card is editable.
   * - `pending` → warning hourglass, a sent invitation awaiting acceptance.
   */
  badge?: AvatarBadgeVariant;
  onPress?: () => void;
}

function SquareCardImpl({
  name,
  subtitle,
  avatarUrl,
  avatarName,
  active = false,
  badge,
  onPress,
}: SquareCardProps) {
  const tint = useThemeColor({}, 'tint');
  const border = useThemeColor({}, 'border');

  const body = (
    <Surface
      variant="plain"
      padding={12}
      radius={14}
      style={[styles.card, { borderColor: active ? tint : border }]}
    >
      <View style={styles.topRow}>
        <Avatar url={avatarUrl} name={avatarName ?? name} badge={badge} />
      </View>
      <View style={styles.text}>
        <Text variant="body" weight="semibold" numberOfLines={1} ellipsizeMode="tail">
          {name}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="textMuted" numberOfLines={1} ellipsizeMode="tail">
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Surface>
  );

  const handlePress = useCallback(() => {
    onPress?.();
  }, [onPress]);

  if (!onPress) return body;

  const accessibilityLabel = [name, subtitle].filter(Boolean).join(', ');

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => (pressed ? styles.pressed : null)}
    >
      {body}
    </Pressable>
  );
}

export const SquareCard = memo(SquareCardImpl);

export interface AddSquareCardProps {
  label: string;
  onPress?: () => void;
  /** Renders a locked state (lock icon + muted label) and ignores `onPress`. */
  locked?: boolean;
  lockedLabel?: string;
}

function AddSquareCardImpl({ label, onPress, locked = false, lockedLabel }: AddSquareCardProps) {
  const border = useThemeColor({}, 'border');
  const muted = useThemeColor({}, 'textMuted');

  // When locked the card is non-interactive, so announce it here as a disabled
  // button. When interactive, the wrapping Pressable below carries the label.
  const bodyA11y = locked
    ? {
        accessible: true,
        accessibilityRole: 'button' as const,
        accessibilityLabel: lockedLabel ?? label,
        accessibilityState: { disabled: true },
      }
    : undefined;

  const body = (
    <View {...bodyA11y} style={[styles.addCard, { borderColor: border }]}>
      {locked ? (
        <>
          <Icon name="lock.fill" size={20} color={muted} />
          <Text variant="caption" tone="textMuted" weight="medium" style={styles.addLabel}>
            {lockedLabel ?? label}
          </Text>
        </>
      ) : (
        <>
          <Icon name="plus" size={22} color={muted} />
          <Text variant="caption" tone="textMuted" weight="medium" style={styles.addLabel}>
            {label}
          </Text>
        </>
      )}
    </View>
  );

  if (locked || !onPress) return body;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => (pressed ? styles.pressed : null)}
    >
      {body}
    </Pressable>
  );
}

export const AddSquareCard = memo(AddSquareCardImpl);

/** Card-shaped placeholder matching `SquareCard`'s footprint, for loading rows. */
export function SquareCardSkeleton() {
  return <Skeleton width={SQUARE_CARD_SIZE} height={SQUARE_CARD_SIZE} borderRadius={14} />;
}

const styles = StyleSheet.create({
  card: {
    width: SQUARE_CARD_SIZE,
    height: SQUARE_CARD_SIZE,
    borderWidth: 2,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  text: {
    gap: 2,
  },
  addCard: {
    width: SQUARE_CARD_SIZE,
    height: SQUARE_CARD_SIZE,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  addLabel: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});
