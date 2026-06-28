import type { ReactNode } from 'react';

export interface NotificationBannerProps {
  /**
   * The title of the notification
   */
  title: string;

  /**
   * Optional subtitle text
   */
  subtitle?: string;

  /**
   * Whether to show the leading illustration
   * @default true
   */
  showIllustration?: boolean;

  /**
   * Custom leading visual rendered in place of the default logo
   * (e.g. an icon avatar). Falls back to the logo when omitted.
   */
  icon?: ReactNode;

  /**
   * Test ID for testing purposes
   */
  testID?: string;
}
