import path from 'node:path';

import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      // Cuts off a transitive chain (Sentry/env/kv-store) that can't load
      // outside Metro. See test/stubs/use-persisted-state.ts for why.
      '@/hooks/use-persisted-state': path.resolve(__dirname, 'test/stubs/use-persisted-state.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['**/__tests__/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/.expo/**', '**/ios/**', '**/android/**'],
  },
});
