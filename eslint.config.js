import js from '@eslint/js';
import globals from 'globals';
import pluginSvelte from 'eslint-plugin-svelte';

export default [
  js.configs.recommended,
  ...pluginSvelte.configs['flat/recommended'],
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
];
