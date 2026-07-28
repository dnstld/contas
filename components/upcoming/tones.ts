import type { Colors } from '@/constants/theme';

/**
 * Soft, distinct avatar fallback tones cycled across upcoming payments so they
 * read as separate chips rather than one blob. Shared by the summary card and
 * the `/upcoming` modal so the same item gets the same color in both places.
 */
export const UPCOMING_AVATAR_TONES: (keyof typeof Colors.light)[] = [
  'positiveSurface',
  'secondary',
  'negativeSurface',
];
