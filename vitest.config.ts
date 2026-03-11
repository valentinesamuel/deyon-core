import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    projects: [
      './vitest.unit.config.ts',
      './vitest.integration.config.ts',
      './vitest.e2e.config.ts',
    ],
  },
});
