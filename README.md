# Fuju SNS Frontend

React + TypeScript + Vite で動く Fuju SNS のフロントエンド実装。詳細な実装計画は `docs/tasks/` 配下を参照。

## Dev notes

### tsconfig で `erasableSyntaxOnly` を外している理由

`tsconfig.app.json` には `erasableSyntaxOnly` を**意図的に設定していない**。
`src/auth-component/` は別リポジトリの git submodule で、内部でパラメータ
プロパティ (`constructor(private readonly config: AuthConfig)`) などの
ランタイム挙動を伴う TS 構文を使っている。フラグを有効にすると submodule
を巻き込んでコンパイルが失敗するため、当リポジトリ側で外している。

submodule を自前のコードベースに引き取るタイミングでフラグを再投入する。

### Layer boundary enforcement

レイヤ境界は `eslint.config.js` の `import/no-restricted-paths` で強制している。
`src/ui/**` から `src/api/`, `src/hooks/`, `src/state/`, `src/services/`, `src/routes/` への
import は lint エラーになる。契約は `src/types/` (VM 型) を介するのみ。

違反があれば lint で即検出される。追加でレビュー観点として目視確認する必要はない。

### Admin user picker が client-side filter な理由

swagger が `/users` に search パラメータを提供していないため、Admin 画面の
ユーザー検索は offset ページング + クライアント側フィルタで妥協している。
ユーザー数が増えて実用に支障が出たら、backend 側にサーチ API を追加する
（backlog 03 の P2-13 / 追加項目として検討）。

---

(以下は Vite のテンプレ README)

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
