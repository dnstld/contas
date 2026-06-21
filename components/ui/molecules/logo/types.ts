export type LogoSize = 'small' | 'medium' | 'large';

export interface UseLogoReturn {
  illustrationWidth: number;
  laptopWidth: number;
}

export interface LogoProps {
  /**
   * Size of the logo
   * @default "small"
   */
  size?: LogoSize;

  /**
   * Accessibility label for the logo
   * @default "Contas logo"
   */
  accessibilityLabel?: string;

  /**
   * Test ID for testing purposes
   */
  testID?: string;
}
