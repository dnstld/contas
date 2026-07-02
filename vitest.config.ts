import { defineConfig } from 'vitest/config';

export default defineConfig({
  // `@/*` path aliases are resolved natively from tsconfig.json (Vite's built-in
  // tsconfig-paths support), so no plugin is needed.
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
    include: ['**/__tests__/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/.expo/**', '**/ios/**', '**/android/**'],
  },
});
