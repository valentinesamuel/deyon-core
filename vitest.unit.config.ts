import { createRequire } from 'node:module';
import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

const require = createRequire(import.meta.url);

export default defineConfig({
  plugins: [
    swc.vite({
      module: { type: 'es6' },
      jsc: { transform: { decoratorMetadata: true } },
    }),
  ],
  resolve: {
    alias: {
      '@adapters': '/Users/valentinesamuel/Desktop/deyon/deyon_be/src/adapters',
      '@broker': '/Users/valentinesamuel/Desktop/deyon/deyon_be/src/broker',
      '@config': '/Users/valentinesamuel/Desktop/deyon/deyon_be/src/configs',
      '@modules': '/Users/valentinesamuel/Desktop/deyon/deyon_be/src/modules',
      '@shared': '/Users/valentinesamuel/Desktop/deyon/deyon_be/src/shared',
      express: require.resolve('express'),
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
      reporter: ['text', 'json', 'html', 'lcov'],
      reportOnFailure: true,
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
