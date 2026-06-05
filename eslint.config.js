import tseslint from 'typescript-eslint';
import sveltePlugin from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';

export default tseslint.config(
  // Base TypeScript strict config
  ...tseslint.configs.strictTypeChecked,

  // Svelte files
  {
    files: ['**/*.svelte'],
    plugins: {
      svelte: sveltePlugin,
    },
    processor: sveltePlugin.processors['.svelte'],
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        parser: tseslint.parser,
      },
    },
    rules: {
      ...sveltePlugin.configs.recommended.rules,
    },
  },

  // Global rules for all TS/Svelte files
  {
    files: ['**/*.ts', '**/*.svelte'],
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'error',
      'no-console': 'warn',
    },
  },

  // Ignore patterns (replaces .eslintignore in flat config)
  {
    ignores: ['dist/**', 'node_modules/**', 'reference/**'],
  },
);
