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
    },
  },
  test: {
    include: ['test/integration/**/*.spec.ts'],
    environment: 'node',
    globals: true,
    testTimeout: 30000,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    globalSetup: ['test/helpers/global-setup.ts'],
    setupFiles: ['test/helpers/integration-setup.ts'],
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage/integration',
    },
  },
});
