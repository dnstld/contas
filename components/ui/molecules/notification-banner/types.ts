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
   * Whether to show the logo illustration
   * @default true
   */
  showIllustration?: boolean;

  /**
   * Test ID for testing purposes
   */
  testID?: string;
}
