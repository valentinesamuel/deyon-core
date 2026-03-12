'use strict';

const tseslint = require('typescript-eslint');
const globals = require('globals');
const prettierPlugin = require('eslint-plugin-prettier/recommended');

module.exports = tseslint.config(
  // Global ignores (replaces ignorePatterns)
  {
    ignores: ['eslint.config.js', 'dist/**', 'test/load/**'],
  },

  // typescript-eslint recommended preset
  // Replaces: parser, plugins, extends: plugin:@typescript-eslint/recommended
  ...tseslint.configs.recommended,

  // Main config block
  {
    languageOptions: {
      sourceType: 'module',
      parserOptions: {
        project: 'tsconfig.json',
        tsconfigRootDir: __dirname,
      },
      globals: {
        // Replaces: env: { node: true, jest: true }
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
    },
  },

  // Prettier — must be last to win all formatting conflicts
  // Replaces: extends: plugin:prettier/recommended
  prettierPlugin,
);
