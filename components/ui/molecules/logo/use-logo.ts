import { useMemo } from 'react';

import type { LogoProps, UseLogoReturn } from './types';

const SIZES = {
  small: { illustration: 122, laptop: 99 },
  medium: { illustration: 200, laptop: 164 },
  large: { illustration: 300, laptop: 250 },
} as const;

export function useLogo({ size = 'small' }: Pick<LogoProps, 'size'>): UseLogoReturn {
  return useMemo(() => {
    const { illustration, laptop } = SIZES[size];
    return { illustrationWidth: illustration, laptopWidth: laptop };
  }, [size]);
}
