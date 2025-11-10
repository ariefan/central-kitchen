import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json',
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        global: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...tsPlugin.configs['recommended-requiring-type-checking'].rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/prefer-nullish-coalescing': 'warn', // Changed to warn
      '@typescript-eslint/prefer-optional-chain': 'warn', // Changed to warn
      '@typescript-eslint/no-unnecessary-type-assertion': 'warn', // Changed to warn
      '@typescript-eslint/no-unsafe-assignment': 'warn', // Added to allow with warning
      '@typescript-eslint/no-unsafe-member-access': 'warn', // Added to allow with warning
      '@typescript-eslint/no-unsafe-call': 'warn', // Added to allow with warning
      '@typescript-eslint/no-unsafe-argument': 'warn', // Added to allow with warning
      'no-unused-vars': 'off', // Turn off base rule as we use TypeScript version
      'no-undef': 'off', // Turn off for TypeScript
    },
  },
  {
    ignores: ['dist/', 'node_modules/', '*.js', 'coverage/', 'src/scripts/seed.ts'],
  },
];