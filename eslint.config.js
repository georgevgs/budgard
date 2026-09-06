import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import vitest from '@vitest/eslint-plugin';

// The style authority is https://react-typescript-style-guide.com/. Everything
// in this file that can be checked mechanically is checked here rather than
// written down somewhere, because a rule nobody runs is a rule that drifts.
export default tseslint.config(
  { ignores: ['dist', 'coverage'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'error',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      // The guide asks for early returns and a blank line before the return.
      'padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: 'return' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          // Zod's own documented import. `z` is a schema builder used as a
          // namespace, not a bag of separately tree-shakeable functions.
          selector:
            "ImportDeclaration[source.value!='zod'] > ImportNamespaceSpecifier",
          message:
            'Import named bindings rather than a namespace — wildcard imports defeat tree-shaking.',
        },
      ],
    },
  },
  {
    // Control flow the guide is silent on but this codebase is not: rank comes
    // from being able to scan a component top to bottom. Build scripts and
    // tests are exempt — nobody reads them for the happy path.
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/**/*.test.{ts,tsx}', 'src/common/ui/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "ImportDeclaration[source.value!='zod'] > ImportNamespaceSpecifier",
          message:
            'Import named bindings rather than a namespace — wildcard imports defeat tree-shaking.',
        },
        {
          selector: 'ConditionalExpression',
          message:
            'No ternaries — use an if/else block, or a helper that returns early.',
        },
        {
          // Children position, `&&` only. `disabled={isSubmitting || !isValid}`
          // is a boolean prop and `{name || '-'}` is a fallback value; both
          // read fine. `{cond && <Thing />}` is the one that hides a branch
          // inside the markup.
          selector:
            ":matches(JSXElement, JSXFragment) > JSXExpressionContainer > LogicalExpression[operator='&&']",
          message:
            'No && in JSX — use a helper render function with an if return.',
        },
      ],
    },
  },
  {
    // shadcn primitives are vendored, not ours: they keep upstream's shape so
    // the next `shadcn add` stays a clean diff.
    files: ['src/common/ui/**'],
    rules: {
      'react-refresh/only-export-components': 'off',
      'no-restricted-syntax': 'off',
      'padding-line-between-statements': 'off',
    },
  },
  {
    // A test asserts behaviour or pins a regression. These rules are what stop
    // one that does neither from being committed.
    files: ['src/**/*.test.{ts,tsx}', 'e2e/**/*.spec.ts'],
    plugins: { vitest },
    rules: {
      'vitest/expect-expect': 'error',
      'vitest/valid-expect': 'error',
      'vitest/no-disabled-tests': 'error',
      'vitest/no-focused-tests': 'error',
      'vitest/no-identical-title': 'error',
    },
  },
  {
    // Playwright specs are Node, not browser React. Two of its conventions
    // look like React violations and are not: a fixture declares unused
    // dependencies as `async ({}, use)`, and the `use` callback is a fixture
    // parameter rather than React's `use` hook.
    files: ['e2e/**', 'playwright.config.ts', 'scripts/**'],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      'no-empty-pattern': 'off',
      'react-hooks/rules-of-hooks': 'off',
    },
  }
);
