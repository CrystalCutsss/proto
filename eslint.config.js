// ESLint flat config for the whole monorepo.
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/.turbo/**',
      '**/node_modules/**',
      '**/.frozen/**',
      '**/design-input/**',
      'design-system/source/**',
      'coverage/**',
      'templates/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    files: [
      '**/*.mjs',
      '**/*.config.{js,ts}',
      'tools/**',
      'packages/{registry,site-router,build-kit,fonts,tokens}/**',
    ],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // Vendored CommonJS hooks (ADR-0007): kept as upstream wrote them, so only the environment is declared.
    files: ['.claude/hooks/vendor/*.cjs'],
    languageOptions: { sourceType: 'commonjs', globals: { ...globals.node } },
    rules: { '@typescript-eslint/no-unused-vars': 'off', '@typescript-eslint/no-require-imports': 'off' },
  },
  prettier,
);
