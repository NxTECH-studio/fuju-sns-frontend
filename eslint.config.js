import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import importPlugin from 'eslint-plugin-import'
import prettierConfig from 'eslint-config-prettier'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// Layer boundary zones — enforced via import/no-restricted-paths so the
// separation declared in docs/tasks/02-implement-fuju-sns-frontend.md can't
// drift silently. The auth-component submodule is its own package and
// exempt from these rules.
const layerBoundaryZones = [
  {
    target: './src/ui',
    from: ['./src/api', './src/hooks', './src/state', './src/services', './src/routes'],
    message:
      'UI layer must not import from api/hooks/state/services/routes. Receive data via props from the routes layer.',
  },
  {
    target: './src/api',
    from: ['./src/hooks', './src/state', './src/ui', './src/routes', './src/services'],
    message:
      'API layer must stay free of React / routes / UI / hooks / services imports.',
  },
  {
    target: './src/services',
    from: ['./src/hooks', './src/state', './src/ui', './src/routes'],
    message:
      'Services layer must not depend on hooks/state/ui/routes. It should only touch api/ and its own VM types.',
  },
  {
    target: './src/state',
    from: ['./src/routes'],
    message:
      'State providers must not depend on routes/. They may render ui/ components but must not import route-level modules.',
  },
  {
    target: './src/hooks',
    from: ['./src/ui', './src/routes'],
    message: 'Hooks must not import from ui/ or routes/.',
  },
]

export default defineConfig([
  globalIgnores(['dist', 'src/auth-component/**']),
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      prettierConfig,
    ],
    plugins: {
      import: importPlugin,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.app.json',
        },
      },
    },
    rules: {
      'import/no-restricted-paths': [
        'error',
        {
          zones: layerBoundaryZones,
        },
      ],
    },
  },
])
