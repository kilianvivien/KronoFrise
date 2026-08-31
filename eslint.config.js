// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

/**
 * The sacred boundary (PLAN.md §4.2): core/ and layout/ are pure TypeScript.
 * They never import React, never import an upper layer, never touch the DOM.
 */
const pureLayerRules = {
  'no-restricted-imports': [
    'error',
    {
      patterns: [
        { group: ['react', 'react-dom', 'react/*', 'react-dom/*'], message: 'core/ et layout/ ne dépendent jamais de React (PLAN.md §4.2).' },
        {
          group: ['**/ui/**'],
          message: 'core/ et layout/ ne remontent jamais vers ui/ (PLAN.md §4.2).',
        },
        { group: ['**/store/**', '**/renderer/**', '**/export/**'], message: 'core/ et layout/ ne remontent jamais vers les couches supérieures (PLAN.md §4.2).' },
        { group: ['@use-gesture/*', 'idb-keyval', 'zustand*'], message: 'Dépendance liée à l’UI ou à la persistance : interdite dans core/ et layout/.' },
      ],
    },
  ],
  'no-restricted-globals': [
    'error',
    { name: 'window', message: 'core/ et layout/ ne touchent pas au DOM (PLAN.md §4.2).' },
    { name: 'document', message: 'core/ et layout/ ne touchent pas au DOM (PLAN.md §4.2).' },
    { name: 'navigator', message: 'core/ et layout/ ne touchent pas au DOM (PLAN.md §4.2).' },
    { name: 'localStorage', message: 'core/ et layout/ ne touchent pas au stockage navigateur (PLAN.md §4.2).' },
  ],
};

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'src-tauri'] },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
      globals: globals.browser,
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    files: ['src/core/**/*.ts', 'src/layout/**/*.ts', 'src/shared/**/*.ts'],
    rules: pureLayerRules,
  },
  {
    files: ['**/*.js'],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    // Le service worker ne tourne pas dans une page : ses globales sont
    // celles d'un worker (`self`, `caches`, `clients`), pas celles du DOM.
    files: ['src/pwa/sw.js'],
    // `__PRECACHE__` est substitué à la construction par le greffon de
    // vite.config.ts : dans la source c'est volontairement une globale libre.
    languageOptions: { globals: { ...globals.serviceworker, __PRECACHE__: 'readonly' } },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
);
