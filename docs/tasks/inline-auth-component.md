# auth-component を frontend に直接移植する

## 概要

現在 npm パッケージ `fuju-auth-react` (`^0.1.1`) として依存している `../auth-component`
の実装を frontend リポジトリ内に直接取り込む。`fuju-auth-react` への依存を取り除き、
コードを `src/auth-component/` 配下に同居させて、ローカルで編集・追跡可能な状態にする。

## 背景・目的

- `auth-component` は本プロジェクト専用の認証 SDK だが、現状は別リポジトリで開発し
  npm 経由で `fuju-auth-react@^0.1.1` として参照している。frontend 側で挙動を直したい
  場合、別リポジトリでリリース → npm install → 反映、という遠回りが必要で、開発サイ
  クルが長い。
- frontend 側で利用しているのは `AuthProvider` / `AuthGuard` / `useAuth` /
  `useAuthStatus` / `validatePublicId` / `isAuthError` / `ErrorCodes` の一部 API で、
  すでに `AppRoot.tsx` などで密結合している。リポジトリを分けておくメリットが薄い。
- `frontend/eslint.config.js` の `globalIgnores(['dist', 'src/auth-component/**'])` に
  すでに `src/auth-component/**` が ignore 対象として書かれており、配置先として
  想定されている形跡がある。
- 直接移植することで、auth まわりの修正・型変更・診断イベント追加を frontend のブラ
  ンチ運用だけで完結できるようにしたい。

## 影響範囲

### 追加されるファイル (`auth-component/src/` をそのまま移植)

- `src/auth-component/` 配下に以下を配置する (元のディレクトリ構造を維持):
  - `index.ts` (公開 API のバレル)
  - `AuthProvider.tsx`
  - `AuthGuard.tsx`
  - `ErrorCodes.ts`
  - `isAuthError.ts`
  - `types.ts`
  - `api/ApiClient.ts`
  - `api/decodeJWT.ts`
  - `api/endpoints/{auth,mfa,social,user}.ts`
  - `components/{LoginForm,RegisterForm,MFAChallenge,MFASetupWizard,ProfileEditor,SocialSignupPublicIdForm,AuthErrorFallback}.tsx`
  - `components/content/{email,identifier,password,publicId,index}.ts`
  - `components/constant/{fieldForCode,messageForCode}.ts`
  - `components/form/{button,form,submitButtons,textBox,withSocial}.tsx`
  - `hooks/{useAuth,useAuthStatus,useUser}.ts`
  - `store/{AuthStore,bus,sessionHint,socialSignupSeen}.ts`
  - `utils/otpauth.ts`
  - `validators/{email,password,publicId}.ts`

### 変更されるファイル

- `package.json`
  - `dependencies` から `fuju-auth-react` を削除
  - `broadcast-channel` などの追加 runtime 依存は **不要**
    (`store/bus.ts` は `globalThis.BroadcastChannel` のブラウザ標準 API のみ使用)
- `package-lock.json` (npm install で自動更新)
- `fuju-auth-react` から import している以下の 11 ファイルの import パス書き換え
  (`"fuju-auth-react"` → 相対パス、または tsconfig に paths を切るなら `"@/auth-component"`):
  - `src/AppRoot.tsx`
  - `src/routes/GlobalTimelineRoute.tsx`
  - `src/routes/RootLayoutRoute.tsx`
  - `src/routes/settings/messageForPublicIdError.ts`
  - `src/routes/settings/SettingsProfileSection.tsx`
  - `src/routes/LoginRoute.tsx`
  - `src/hooks/useAuthToken.ts`
  - `src/routes/UserProfileRoute.tsx`
  - `src/routes/PostDetailRoute.tsx`
  - `src/state/MeProvider.tsx`
  - `src/routes/PostRow.tsx`

### 変更しないファイル

- `eslint.config.js` の `layerBoundaryZones` (auth-component は `src/auth-component/`
  独立ディレクトリに置くため、既存の layer 制約 (`src/ui` / `src/api` / `src/state`
  / `src/hooks` / `src/services` / `src/routes` 間) には影響しない)
- ただし `eslint.config.js` 既存の `globalIgnores(['dist', 'src/auth-component/**'])`
  はそのまま有効活用する。**移植コードに対しては既存リポジトリの lint ルールを適用
  しない方針**を継続する (元リポジトリ側の lint ルールに準拠している前提)。

### 破壊的変更

- ランタイム挙動は同一バージョン (`fuju-auth-react@0.1.1` 相当) を移植するため、
  consumer 側に対する破壊的変更は無い想定。
- ただし npm に公開済みの `fuju-auth-react@^0.1.1` の最新版が現在の
  `../auth-component/src/` の HEAD と差分があるかは要確認。差分がある場合は移植版が
  新しい挙動になる (今回はこちらを採用)。

## 実装ステップ

1. **移植元の確定とコピー**
   - `cp -r ../auth-component/src/* ./src/auth-component/` で `src/auth-component/`
     配下に元の構造をそのままコピーする (frontend 側に存在しないファイルも含めて全部)。
   - 移植元のコミット ID を記録 (後追い用に PR 説明 or `src/auth-component/README.md`
     の冒頭にメモするのが望ましい)。

2. **依存関係の整理**
   - `package.json` の `dependencies` から `fuju-auth-react` を削除。
   - `npm install` を走らせて `package-lock.json` を再生成。
   - `node_modules/fuju-auth-react` が消えることを確認。

3. **import パスの一括書き換え**
   - 上記「変更されるファイル」一覧の 11 ファイルで、
     `from "fuju-auth-react"` を `from "../auth-component"` などの相対パスに置換。
   - それぞれの import 元ファイルの位置に応じて深さを調整 (例:
     `src/AppRoot.tsx` → `./auth-component`,
     `src/routes/GlobalTimelineRoute.tsx` → `../auth-component`,
     `src/routes/settings/SettingsProfileSection.tsx` → `../../auth-component`,
     `src/hooks/useAuthToken.ts` → `../auth-component`,
     `src/state/MeProvider.tsx` → `../auth-component`)。
   - 公開シンボル (`AuthProvider`, `AuthGuard`, `useAuth`, `useAuthStatus`,
     `validatePublicId`, `isAuthError`, `ErrorCodes`) は `src/auth-component/index.ts`
     からそのまま再エクスポートされているため、import 文の右辺は変更不要。

4. **lint / typecheck の確認**
   - `eslint.config.js` の `globalIgnores` で `src/auth-component/**` が無視されてい
     ることを再確認 (既に存在)。
   - `npm run lint` が通ること (既存ファイルの import パスのみ変わるため、layer
     boundary には影響しないはず)。
   - `npm run build` (= `tsc -b && vite build`) が通ること。
     - 注意: 移植元は `@types/react@^18` を peerDep に書いているが、frontend は
       `react@19.2.4` / `@types/react@19.2.14`。React 19 で動かない API を使ってい
       ないかは元リポジトリで検証済みである前提。`tsc -b` でエラーが出たら個別対処。

5. **動作確認**
   - `npm run dev` で起動し、最低限以下を手動で確認:
     - 起動直後に `/global` がパブリックモードで描画される
     - `/login` で LoginForm が出てログイン → bootstrap → `/` に遷移できる
     - 認証済みでリロードしても session が維持される
     - `/settings` の公開 ID 編集 (`SettingsProfileSection`) でバリデーションが動く
     - ログアウトしてから 401 経路を踏んでも refresh が走る
   - ローカル DevTools で `BroadcastChannel('fuju-auth-bus')` が機能することを確認
     (複数タブでログアウトが伝播するか)。

## テスト要件

- 既存リポジトリには現状テスト基盤が存在しないため、移植元の `vitest` テストは
  **本タスクでは取り込まない** (テスト基盤導入は別タスク扱い)。
- 代わりに上記「動作確認」を手動で必ず実施する。
- 影響を受ける主要画面:
  - 公開ルート: `/global`, `/posts/:id`, `/users/:sub`
  - 認証必須ルート: `/`, `/settings`, `/users/:sub/follows`
  - 認証フロー: `/login`, MFA challenge, MFA setup wizard, social signup public-id

## 技術的な補足

### 依存関係

- 移植元コードは外部 npm 依存ゼロで動く (React + ブラウザ標準 API のみ)。
  - `store/bus.ts` は `globalThis.BroadcastChannel` を直接使用 (npm の
    `broadcast-channel` パッケージは使っていない)。
  - `store/sessionHint.ts` / `socialSignupSeen.ts` は localStorage / sessionStorage
    のみ。
  - `api/decodeJWT.ts` は標準 `atob` / `TextDecoder`。
  - `utils/otpauth.ts` は文字列組み立てのみ。
- 移植元は `react@^18 || ^19` を peer dependency に許容しており、frontend (React 19)
  で問題ない。

### tsconfig 整合性

- frontend の `tsconfig.app.json` は `verbatimModuleSyntax: true` /
  `noUnusedLocals: true` などが有効。移植元は元から型 import を `import type` で書い
  ており、現状のコードのままで通る想定。
- 通らないケース (元リポジトリは未使用変数を許可していた等) が出たら、
  `src/auth-component/` を `tsconfig.app.json` の `exclude` に追加する選択肢もあるが、
  まずは include のままで通すことを目指す。

### eslint 整合性

- `eslint.config.js` は既に `globalIgnores(['dist', 'src/auth-component/**'])` を
  含んでいるため、移植コードに対する lint チェックは無効。元リポジトリの lint ルー
  ルとの差異は気にしなくてよい。
- 副作用として、移植コードのスタイル (prettier 等) は frontend 側の `format` 対象に
  もならない。一貫性を取りたい場合は、後続タスクで ignore を外して個別調整する。

### 既存ブランチとの関係

- 現在のブランチ `fix/follow-display-and-add-icon-banner-upload` は profile / icon /
  banner upload 関連の変更を含む。本タスクはコードベースの広範囲に手を入れるため
  別ブランチで実施するのが無難 (例: `chore/inline-auth-component`)。

### パッケージ削除後のフォールバック

- `fuju-auth-react` を `package.json` から削除した後、誤って再 install されないよう
  `package-lock.json` も同時にコミットする。
- 何かあった時に戻せるよう、本 PR は単独で revert 可能にしておく
  (importパス書き換え + ファイル追加 + package.json 変更を 1 コミットにまとめるか、
  少なくとも 1 PR にまとめる)。

### 未確認事項 (実装時に確認する)

- `../auth-component/src/` 直下にエクスポートはされていないが内部で利用されている
  ファイル (例: `AuthProvider.tsx` 内の `useAuthContext` など) も含めて、抜け漏れ
  なくコピーされていることを確認する。
- 移植元の `dist/` や `tsup.config.ts` / `vitest.config.ts` / `package.json` /
  `tsconfig.json` 等は **frontend 側に持ち込まない**。あくまで `src/` のみ。
