import { StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/atoms/icon';
import { useThemeColor } from '@/hooks/use-theme-color';
import { type AvatarSize } from '@/components/ui/atoms/avatar';

/**
 * Corner badge variants rendered over an avatar.
 * - `edit` → primary pencil, signalling the entity is editable.
 * - `pending` → warning hourglass, a sent invitation awaiting acceptance.
 * - `declined` → danger cross, an invitation the invitee turned down.
 */
export type AvatarBadgeVariant = 'edit' | 'pending' | 'declined';

/** Box/icon/offset (px) for each size, kept in step with the avatar scale. */
const BADGE_DIMENSIONS: Record<AvatarSize, { box: number; icon: number; offset: number }> = {
  sm: { box: 14, icon: 9, offset: -1 },
  md: { box: 16, icon: 10, offset: -2 },
  lg: { box: 18, icon: 11, offset: -3 },
};

const VARIANT_ICON: Record<AvatarBadgeVariant, IconName> = {
  edit: 'pencil',
  pending: 'hourglass',
  declined: 'xmark',
};

export interface AvatarBadgeProps {
  variant: AvatarBadgeVariant;
  /** Size variant. Defaults to `md`. Match the avatar it sits on. */
  size?: AvatarSize;
}

export function AvatarBadge({ variant, size = 'md' }: AvatarBadgeProps) {
  const tint = useThemeColor({}, 'tint');
  const warning = useThemeColor({}, 'warning');
  const negative = useThemeColor({}, 'negative');
  const onPrimary = useThemeColor({}, 'onPrimary');

  const { box, icon, offset } = BADGE_DIMENSIONS[size];

  const background = variant === 'pending' ? warning : variant === 'declined' ? negative : tint;

  return (
    <View
      style={[
        styles.badge,
        {
          width: box,
          height: box,
          borderRadius: box / 2,
          right: offset,
          bottom: offset,
          backgroundColor: background,
        },
      ]}
    >
      <Icon name={VARIANT_ICON[variant]} size={icon} color={onPrimary} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
