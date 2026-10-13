// Stylelint: standard rules plus proto/ds-tokens (no hard-coded design values outside var(--ds-*)).
export default {
  extends: ['stylelint-config-standard'],
  plugins: ['./tools/stylelint/ds-tokens.mjs'],
  ignoreFiles: [
    '**/dist/**',
    '**/node_modules/**',
    '**/.frozen/**',
    '**/design-input/**',
    'design-system/source/**',
    'coverage/**',
  ],
  rules: {
    'proto/ds-tokens': true,
    'selector-class-pattern': null,
    'custom-property-pattern': null,
    'keyframes-name-pattern': null,
    'import-notation': 'string',
  },
  overrides: [
    {
      // Generated token stylesheet is the source of values.
      files: ['packages/tokens/**'],
      rules: { 'proto/ds-tokens': null },
    },
  ],
};
