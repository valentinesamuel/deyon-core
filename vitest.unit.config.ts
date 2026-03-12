import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      jsc: { transform: { decoratorMetadata: true } },
    }),
  ],
  resolve: {
    alias: {
      '@adapters': '/Users/valentinesamuel/Desktop/deyon_be/src/adapters',
      '@broker': '/Users/valentinesamuel/Desktop/deyon_be/src/broker',
      '@config': '/Users/valentinesamuel/Desktop/deyon_be/src/configs',
      '@modules': '/Users/valentinesamuel/Desktop/deyon_be/src/modules',
      '@shared': '/Users/valentinesamuel/Desktop/deyon_be/src/shared',
      express:
        '/Users/valentinesamuel/Desktop/deyon_be/node_modules/.pnpm/express@5.2.1/node_modules/express/index.js',
    },
  },
  test: {
    include: ['src/**/*.spec.ts'],
    exclude: ['src/**/*.module.ts', 'src/main.ts', 'src/migrations/**'],
    environment: 'node',
    globals: true,
    testTimeout: 5000,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage/unit',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts', 'src/main.ts', 'src/migrations/**', 'src/**/*.module.ts'],
      all: true,
      thresholds: {
        lines: 75,
        branches: 70,
        functions: 75,
        statements: 75,
      },
    },
  },
});
