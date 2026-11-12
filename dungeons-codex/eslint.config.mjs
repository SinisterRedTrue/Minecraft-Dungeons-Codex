import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import tseslint from 'typescript-eslint';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...tseslint.configs.strict,
  globalIgnores([
    '.next/**',
    'out/**',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
    'next-env.d.ts',
    'data/**',
    'public/**',
  ]),
  {
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    // CLI scripts report progress on stdout, which is their purpose.
    files: ['scripts/**'],
    rules: { 'no-console': 'off' },
  },
  {
    // Tests index into known fixtures (`rows[0]!`) under noUncheckedIndexedAccess; a wrong
    // assumption there already fails the test with a TypeError. App and script code keep the rule.
    files: ['tests/**'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
]);

export default eslintConfig;
