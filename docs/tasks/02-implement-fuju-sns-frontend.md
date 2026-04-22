# Fuju SNS Frontend 実装

## 概要

`./docs/authcore連携.md` の設計（AuthCore 認証 + Bearer で Fuju バックエンド呼び出し）に沿って、現状 placeholder の `src/App.tsx` を SNS クライアントに置き換える。認証は `src/auth-component` に任せ、Fuju バックエンド (`../backend/docs/swagger.yaml`) の全エンドポイント（画像・Admin 含む）を **React Router + 素の fetch** で操作できる画面を用意する。**ロジック層と UI 層を完全分離**したアーキテクチャで構築する。

## 背景・目的

- `src/main.tsx` で `AuthProvider` + `AuthGuard` が組まれ、`src/App.tsx` が `useAuth()` / `useUser()` の結果を羅列するだけのダミー画面になっている。
- バックエンド（`../backend`）は AuthCore issued Bearer を Introspection で検証する resource server として動作可能。画像・Admin も含む全エンドポイントが swagger に定義済み。
- フロントは「**AuthCore 発行 access token を取得 → Fuju 側 API に `Authorization: Bearer` 付けて送る**」ブリッジが無い状態。`AuthStore.accessToken` は内部 private のまま。
- 今、`auth-component` 側に `getAuthToken` を公開する修正が別途進行中。フロントはその完了を前提に、AuthComponent とバックエンドに **追加の修正を要求しない** 方針で組む。
- 将来の機能追加・テスト容易性・UI 差し替え（例: デザインシステム変更）のコストを下げるため、**ロジックと UI を完全分離**する。

## アーキテクチャ原則（最重要）

### ロジック層と UI 層の完全分離

以下のルールを守る。レビューではまずこの境界違反をチェックする。

**ロジック層** (`src/api/`, `src/hooks/`, `src/state/`, `src/services/`)

- fetch 呼び出し / エラー変換 / 楽観更新 / キャッシュ / Context 状態管理を担当。
- React 依存は hook / Context 提供に留める。ビュー（JSX）を持たない。
- swagger 由来の型は **このレイヤー内に閉じる**。UI 層へは **View Model（表示用に加工済みの型）** として渡す。
- 「いま選択中の投稿が何か」のような UI 固有の一時状態は持たない（`src/ui/` 側の `useState`）。

**UI 層** (`src/ui/`)

- 純粋な presentational component のみ。`import` できるのは他の UI、React、CSS Modules、型のみ。
- `src/api/` / `src/hooks/` / `src/state/` からの import は **禁止**。
- 入力は props、出力は callback（`onSubmit`, `onLike`, `onLoadMore` 等）。
- router / navigation への直接依存は持たない（`<a>` / `href` や `onNavigate` props で受ける）。
- 自身の中で `useState` を使うのは OK（例: フォーム入力値、モーダルの開閉）。ただし API を叩かない。

**結合層（ルート）** (`src/routes/`)

- ページ単位でロジック hook を呼び、結果を UI コンポーネントに props で渡す。
- 「データ取得 → View Model への変換 → UI へ注入 → UI からのイベントをロジックに委譲」だけを行う。
- JSX は UI コンポーネントを組み立てるグルーのみ。新規 presentational な markup を生やさない。

### View Model パターン

- swagger 型（例: `Post`, `PublicUser`, `Image`）は**そのままは UI 層に渡さない**。
- ロジック層で `PostVM` / `UserVM` / `ImageVM` 等に変換し UI に渡す。変換は `src/services/*.ts`（または `src/hooks/` 内のマッパー）で行う。
- 目的: (1) swagger 変更に UI が巻き込まれないこと、(2) UI が View Model を見れば表示に必要な情報が全部揃っていること（`cached` suffix 等のバックエンド内部事情を UI に漏らさない）。
- 例: `PostCard` は `PostAuthor.display_name_cached` ではなく `PostVM.author.displayName` を受け取る。

### ディレクトリレイアウト

```
src/
├── api/                    # [logic] HTTP client + 型 + エラー + endpoints
│   ├── client.ts           #   createFujuClient({ baseURL, getToken })
│   ├── error.ts            #   FujuApiError
│   ├── types.ts            #   swagger 由来の型（ロジック層内部専用）
│   └── endpoints/
│       ├── me.ts
│       ├── users.ts
│       ├── posts.ts
│       ├── timelines.ts
│       ├── follows.ts
│       ├── images.ts
│       └── admin.ts
├── services/               # [logic] View Model 変換 + ドメインロジック
│   ├── mappers.ts          #   Post → PostVM 等
│   └── vm.ts               #   PostVM / UserVM / ImageVM / BadgeVM
├── state/                  # [logic] Context / Provider
│   ├── FujuClientProvider.tsx
│   ├── MeProvider.tsx
│   └── ToastProvider.tsx
├── hooks/                  # [logic] データ取得・副作用フック
│   ├── useFujuClient.ts
│   ├── useMe.ts
│   ├── useAuthToken.ts     #   auth-component の getAuthToken をラップ
│   ├── usePagedList.ts
│   ├── useTimeline.ts      #   home/user/global の切替
│   ├── usePostDetail.ts
│   ├── usePostActions.ts   #   create/delete/like/reply
│   ├── useFollowActions.ts
│   ├── useImageActions.ts
│   └── useAdminBadges.ts
├── ui/                     # [UI] 純粋な presentational component
│   ├── layouts/
│   │   ├── RootLayout.tsx
│   │   └── RootLayout.module.css
│   ├── components/
│   │   ├── PostCard.tsx
│   │   ├── PostComposer.tsx          # 送信ロジックを持たない。onSubmit props で外へ
│   │   ├── OGPPreview.tsx
│   │   ├── ImageUploader.tsx         # 受信した onSelect で File を投げるだけ
│   │   ├── ImageGallery.tsx
│   │   ├── LikeButton.tsx            # liked / count / onToggle を受ける
│   │   ├── FollowButton.tsx          # following / onToggle を受ける
│   │   ├── UserCard.tsx
│   │   ├── BadgeChip.tsx
│   │   ├── Pager.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── Toast.tsx
│   │   └── EmptyState.tsx
│   └── primitives/
│       ├── Button.tsx
│       ├── TextArea.tsx
│       ├── TextInput.tsx
│       └── Avatar.tsx
├── routes/                 # [integration] hook を呼んで UI に props を流す
│   ├── router.tsx
│   ├── HomeTimelineRoute.tsx
│   ├── GlobalTimelineRoute.tsx
│   ├── PostDetailRoute.tsx
│   ├── UserProfileRoute.tsx
│   ├── FollowListRoute.tsx
│   ├── MyProfileEditRoute.tsx
│   ├── ImagesRoute.tsx
│   ├── LoginRoute.tsx
│   ├── NotFoundRoute.tsx
│   └── admin/
│       ├── AdminBadgesRoute.tsx
│       └── AdminUserBadgesRoute.tsx
├── main.tsx
└── index.css               # 共通 token（CSS custom properties）のみ
```

### 依存方向ルール

```
routes  →  hooks, state, services, ui   （OK）
hooks   →  api, state, services          （OK）
state   →  api, services                 （OK）
services→  api                            （OK）
ui      →  ui, primitives, 型のみ        （api / hooks / state は禁止）
api     →  外部のみ                      （hooks / state / ui / routes は禁止）
```

ESLint の `import/no-restricted-paths` 相当の静的チェックが難しい場合、レビュー観点として明文化し、新規ファイルの import を目視で確認する。

## 影響範囲

### 新規追加

- 上記「ディレクトリレイアウト」節のファイル群すべて。
- `.env.development` — `VITE_FUJU_API_BASE_URL`（dev default `http://localhost:8080`）。

### 変更

- `src/main.tsx` — `<BrowserRouter>` + `<FujuClientProvider>` + `<MeProvider>` + `<ToastProvider>` を `AuthProvider` 配下に差し込み。`AuthGuard` はトップから外し、`/login` ルートでのみ使う。
- `src/App.tsx` — 廃止。内容は `src/routes/` に分解。
- `src/index.css` — Vite テンプレ由来のスタイルを削除し、アプリ共通トークンのみ残す。
- `src/App.css` — 削除。
- `package.json` — `react-router@^7` を追加。

### 破壊的変更

- 既存 `App.tsx` の placeholder 画面は削除。
- URL 構造を確定: `/` = home timeline、`/global` = global、`/posts/:id`、`/users/:sub`、`/users/:sub/(followers|following)`、`/me/edit`、`/images`、`/login`、`/admin/badges`、`/admin/users/:sub/badges`。
- `@display_id` による URL は対象外（swagger に検索エンドポイントが無いため sub 直打ち）。

### AuthComponent への影響

- 進行中の **`getAuthToken` 公開**のみに依存。それ以外の修正は行わない。
- 公開形が確定次第、`src/hooks/useAuthToken.ts` でのみ呼び出す（UI やルートからは触らせない）。

### バックエンドへの影響

- なし。swagger の現行エンドポイントのみ利用。

## 実装ステップ

Phase 0〜7 に分け、各 Phase 末に手動動作確認チェックを置く。**各 Phase 内では「ロジック層 → UI 層 → ルート結合」の順に実装**することを推奨する（ロジックを先に固め、UI は後から作る / モック props で単体でも描画確認できる）。

### Phase 0: 基盤（router + fetch wrapper + layout + 分離設計のスケルトン）

1. `react-router@^7` を `package.json` に追加し `npm i`。
2. **ロジック**: `src/api/types.ts` を作成。swagger.yaml `components.schemas` から必要な型を手書き（`ULID` / `Post` / `PublicUser` / `SelfUser` / `FollowResult` / `Image` / `Badge` / 各 envelope / 各 request）。**このファイルは `ui/` から import されない。**
3. **ロジック**: `src/api/error.ts` に `FujuApiError`（`status`, `code`, `message`, `timestamp`）。
4. **ロジック**: `src/api/client.ts` の `createFujuClient({ baseURL, getToken })` を実装。`get / post / put / del / postForm` の 5 メソッド。2xx JSON → 値、204 → `null`、エラー → `FujuApiError`。`AbortSignal` を受ける。
5. **ロジック**: `src/hooks/useAuthToken.ts` — auth-component の `getAuthToken` 公開を唯一ここから呼ぶ。ログイン未完了時は `null` を返す。
6. **ロジック**: `src/state/FujuClientProvider.tsx` — `useAuthToken()` を使って `FujuClient` を生成し Context で配る。`src/hooks/useFujuClient.ts` で取り出し。
7. **ロジック**: `src/services/vm.ts`, `src/services/mappers.ts` の空ファイル（骨だけ）を用意。Phase 2 以降で肉付け。
8. **UI**: `src/ui/primitives/` に `Button` / `TextInput` / `TextArea` / `Avatar` の presentational only 版を作成。CSS Modules で最小限のスタイル。
9. **UI**: `src/ui/components/ErrorBoundary.tsx`（React 19 classic Error Boundary）、`Toast.tsx`、`EmptyState.tsx`。
10. **UI**: `src/ui/layouts/RootLayout.tsx` — props で `user`, `isAdmin`, `onLogout`, `navLinks` を受ける純粋 presentational 実装。内部でデータ取得しない。
11. **ルート**: `src/routes/router.tsx` — `BrowserRouter` + route tree。Phase 0 時点では中身プレースホルダー。
12. **ルート**: 各 Route コンポーネントは hook を呼び、RootLayout に props を渡す「グル」だけを書く。
13. **ルート**: `src/main.tsx` を組み替え: `AuthProvider` → `FujuClientProvider` → `MeProvider`（Phase 1） → `ToastProvider` → `AppRouter`。

**動作確認**: `npm run dev` で `/` / `/global` / `/404` に遷移できる。ヘッダーのログアウトで AuthCore ログアウトが動く。`npm run build` が通る。

### Phase 1: MeContext + 認証ルート分岐

1. **ロジック**: `src/api/endpoints/me.ts` に `meGet`。
2. **ロジック**: `src/services/vm.ts` に `MeVM`（`sub`, `displayName`, `displayId`, `iconUrl`, `bio`, `bannerUrl`, `isAdmin`, `badges: BadgeVM[]`）を追加。`SelfUser → MeVM` のマッパーを `mappers.ts` に追加。
3. **ロジック**: `src/state/MeProvider.tsx` — `{ status, me, refresh, clear }`。`useAuthStatus()` を購読し、`authenticated` に遷移したら `meGet()` → `MeVM` 変換 → state 更新。
4. **ロジック**: `src/hooks/useMe.ts` — Context 読み取り。
5. **UI**: `RootLayout` の `navLinks` に `isAdmin` 連動の Admin リンクを追加（すでに props 化されているので UI 側は差分ほぼ無し）。
6. **ルート**: `src/routes/LoginRoute.tsx` — `/login` で `AuthGuard` または `LoginForm` を mount。ログイン完了で `/` に遷移。
7. **ルート**: 認証必須ルートには `useAuthStatus()` による `<Navigate to="/login" />` ガードを入れる（HOC ではなく各ルートで明示）。

**動作確認**: 未ログインで `/` に入ると global-like な読み取りは可能（次 Phase で実装）、ヘッダーはログインボタン。ログイン後は `is_admin` に応じて Admin ナビが出し分けられる。

### Phase 2: タイムライン閲覧 + 投稿詳細 + 返信一覧

1. **ロジック**: `src/api/endpoints/posts.ts`（`listPosts`, `getPost`, `listReplies`）、`src/api/endpoints/timelines.ts`（`home`, `user`, `global`）。
2. **ロジック**: `services/vm.ts` に `PostVM`（`id`, `content`, `createdAt`, `author: AuthorVM`, `images: ImageVM[]`, `tags: TagVM[]`, `ogpPreviews: OGPVM[]`, `likesCount`, `repliesCount`, `parentPostId`, `likedByViewer`, `followingAuthor`）。
3. **ロジック**: `src/hooks/usePagedList.ts`（汎用 cursor ページング）。`src/hooks/useTimeline.ts`（home/user/global の切替）。`src/hooks/usePostDetail.ts`（投稿 + 返信を並行取得）。
4. **UI**: `PostCard.tsx`（`post: PostVM`, `onLike?`, `onOpen?` を受ける）、`OGPPreview.tsx`、`Avatar.tsx`（既存）、`Pager.tsx`（`loading`, `hasMore`, `onLoadMore` を受ける）。
5. **ルート**: `HomeTimelineRoute.tsx` / `GlobalTimelineRoute.tsx` / `PostDetailRoute.tsx`。hook から `PostVM[]` を取り出して `PostCard` に流すだけ。OGP 空の投稿詳細に「OGP 再取得」ボタンを配置（`usePostDetail` の `refresh` を呼ぶ）。

**動作確認**: Home / Global / Post 詳細が描画される。未ログインでも Global / Post 詳細は見える。

### Phase 3: 投稿作成・返信・削除

1. **ロジック**: `posts.ts` に `create`, `delete`。`src/hooks/usePostActions.ts` に `createPost(input): Promise<PostVM>` / `deletePost(id): Promise<void>`。成功時に楽観更新するヘルパー（ただし composer は外に出す）。
2. **UI**: `PostComposer.tsx` — `onSubmit(content, imageIds?, parentPostId?): Promise<void>` props のみ。内部では `useState` で本文を持つ。fetch しない。
3. **ルート**: `HomeTimelineRoute` / `PostDetailRoute` に composer を設置。`onSubmit` で `usePostActions().createPost` を呼び、成功で `useTimeline().prepend(vm)` を呼ぶ。
4. **UI**: `PostCard` に `onDelete?` を追加。所有判定（作者 sub === me.sub）はルート側で判断し、`canDelete` を props で渡す（UI は削除可否を受け取るだけ）。

**動作確認**: ログイン → 投稿 → Global にも反映 → 返信 → 自分の投稿を削除 → 404。

### Phase 4: いいね・フォロー

1. **ロジック**: `posts.ts` に `like`, `unlike`。`src/api/endpoints/follows.ts`（`follow`, `unfollow`, `listFollowers`, `listFollowing`）。
2. **ロジック**: `src/hooks/useLikeToggle.ts`（楽観更新 + rollback）、`src/hooks/useFollowActions.ts`（同上）。
3. **UI**: `LikeButton.tsx`（`liked`, `count`, `onToggle` を受ける）、`FollowButton.tsx`（`following`, `onToggle`）。
4. **UI**: `UserCard.tsx`（`user: UserVM` を受ける）。
5. **ルート**: `FollowListRoute.tsx`（`/users/:sub/(followers|following)`）。`UserCard` の list。

**動作確認**: Home / Post 詳細 / プロフィールで like toggle、Follow toggle と followers / following 一覧の増減。

### Phase 5: プロフィール表示 + 編集

1. **ロジック**: `src/api/endpoints/users.ts`（`get`, `update`, `list`）、`src/hooks/useUserProfile.ts`、`src/hooks/useProfileEdit.ts`。
2. **ロジック**: `services/vm.ts` に `UserVM` と、`PublicUser → UserVM` マッパー。
3. **UI**: `UserProfileView.tsx`（プロフィール全体を props で受ける presentational）。
4. **ルート**: `UserProfileRoute.tsx` — `useUserProfile(sub)` + `useTimeline('user', sub)` を合成して UI に渡す。
5. **ルート**: `MyProfileEditRoute.tsx`（`/me/edit`） — `useProfileEdit()` が `update({bio, bannerUrl})` と `MeContext.refresh()` を行う。UI は `TextArea`, `TextInput` の組み合わせで presentational。

**動作確認**: 他人プロフィールが見える / follow できる。`/me/edit` で bio が更新される。

### Phase 6: 画像アップロード

1. **ロジック**: `src/api/endpoints/images.ts`（`listMine`, `upload`, `delete`）、`src/hooks/useImageActions.ts`、`services/vm.ts` に `ImageVM`。
2. **UI**: `ImageUploader.tsx`（`onSelect(file): void` を受ける。fetch しない）、`ImageGallery.tsx`（`images: ImageVM[]`, `onDelete?`, `onAttach?` を受ける）。
3. **ルート**: `ImagesRoute.tsx`（`/images`） — 自分の画像一覧 + アップロード + 削除を結合。`useImageActions` がエラー（5MiB 超 / MIME 違反 / R2 未設定の 404）を受け取り、`ToastProvider` 経由で通知。
4. **ルート**: `HomeTimelineRoute` / `PostDetailRoute` の composer に画像添付機能を結合。`imageIds` を `PostComposer` に props で渡す（composer 自体は ID 配列を表示するだけで fetch しない）。
5. R2 未設定（404）検知: `useImageActions` がその旨の状態を返し、UI 層は「画像機能は現在無効です」表示に切り替える。

**動作確認**: `/images` でアップロード → 一覧に出る → 削除できる。投稿に画像添付 → 投稿詳細で表示。

### Phase 7: Admin バッジ + OGP 再取得 UX 仕上げ

1. **ロジック**: `src/api/endpoints/admin.ts`（`badgesList`, `badgesCreate`, `badgesUpdate`, `badgesGrant`, `badgesRevoke`）、`src/hooks/useAdminBadges.ts`、`services/vm.ts` に `BadgeVM`。
2. **UI**: `BadgeChip.tsx`、`BadgeForm.tsx`（`onSubmit` props、fetch しない）、`BadgeList.tsx`。
3. **ルート**: `AdminBadgesRoute.tsx`（`/admin/badges`） — `MeContext.isAdmin === false` なら `<Navigate to="/" />`。
4. **ルート**: `AdminUserBadgesRoute.tsx`（`/admin/users/:sub/badges`） — ユーザー検索は swagger に無いため sub 手入力 UI で妥協。
5. OGP 再取得を `PostDetailRoute` で共通化（Phase 2 で仮実装したものを仕上げ）。

**動作確認**: admin で badge 作成 → 他ユーザーに付与 → プロフィールに出る → 剥奪で消える。非 admin で `/admin/*` に入れない。

## テスト要件

- **自動テストなし**。全 Phase の動作確認は手動で実施。
- 各 Phase 末尾の「動作確認」チェックリストを毎 PR で実行する。
- `npm run build`（`tsc -b && vite build`）が型エラーなく通る。
- `npm run lint` に違反がない。
- **分離違反の目視レビュー**: 新規ファイルの `import` を見て、`ui/` から `api/` / `hooks/` / `state/` を import していないことを確認する（PR レビュー観点）。

## 技術的な補足

### 確定事項

- **Router**: React Router v7。
- **API client**: 自前 `fetch` wrapper。openapi-typescript / TanStack Query は不採用。
- **Styling**: CSS Modules。Tailwind 不採用。
- **状態管理**: React 標準（`useState` / `useReducer` / Context）のみ。Zustand / Redux 不採用。
- **バリデーション**: サーバの `code` / `message` をそのまま表示。FE 側は必須・文字数の軽いチェックのみ。
- **ポーリングなし**: OGP のみ手動「再取得」ボタン。
- **楽観更新**: like / follow の toggle のみ。失敗で rollback。
- **handle URL**: `/users/:sub` に統一。
- **base URL**: `import.meta.env.VITE_FUJU_API_BASE_URL`（dev default `http://localhost:8080`）。

### AuthCore トークン取得の配線

- `auth-component` の `getAuthToken` 公開が完了次第、`src/hooks/useAuthToken.ts` がそれを呼ぶ唯一の場所。ルート / UI / 他 hook は `useAuthToken()` 経由でのみ token を取得する。
- 公開形（`useAuth()` 戻り値 / `useAuthContext` の再 export / 新規 hook のどれか）は確定次第本書を追記。
- `AuthGuard` は `/login` ルートでのみ使用。トップ mount では使わない（public ルートを guard 外に置きたいため）。

### 401 ハンドリング

- AuthStore の silent refresh に任せ、FE 側で明示的 refresh は呼ばない。
- Fuju API が 401 を返した場合、`ToastProvider` で「ログインが必要です」と通知し、認証必須ルートなら `/login` へ遷移（自動遷移は `useEffect` で 1 回のみ）。

### View Model 命名規則

- 型名サフィックス: `VM`（例: `PostVM`, `UserVM`, `ImageVM`, `BadgeVM`, `MeVM`, `OGPVM`, `AuthorVM`, `TagVM`）。
- フィールドは `camelCase`（swagger の `snake_case` をロジック層で変換する）。
- `*_cached` suffix は **除去**する（UI に漏らさない）。
- タイムスタンプは `Date` ではなく ISO 文字列（`createdAt: string`）で UI に渡す（整形は UI 層でフォーマッタを呼ぶ）。

### ESLint による分離の強制（任意・後続）

- `import/no-restricted-paths` で以下を禁止ルール化できる:
  - `ui/**` から `api/**` / `hooks/**` / `state/**` / `services/**` への import
  - `api/**` から `hooks/**` / `state/**` / `ui/**` / `routes/**` への import
- 本 Phase 0 の `eslint.config.js` 変更は **任意**。PR レビューで目視チェックで十分なら後続タスクに回す。

### 依存タスクと前後関係

- **依存**: `auth-component` の `getAuthToken` 公開修正の完了。Phase 0 までは公開待ちでも書けるが、Phase 1 以降の動作確認には必須。
- **後続**: backend の DB 配線（`../backend/docs/tasks/08-wire-postgres-repository.md`）が終わるとデータ永続化で動作確認の再現性が上がる（未完了でもデータを作り直せば問題なし）。

## 未確定事項・要確認

- `auth-component` 側の `getAuthToken` 公開方法（`useAuth()` の戻り値 / 新 hook / Context 再 export）。確定後、`src/hooks/useAuthToken.ts` の実装を具体化する。
- `/login` ルートで `AuthGuard` を使うか `LoginForm` を直接 mount するか。
- Admin 画面のユーザー検索 UX（sub 手入力で進めるか、`GET /users` を使った簡易検索を付けるか）。
- ESLint の `import/no-restricted-paths` をこのタスク内で導入するか、後続タスクに切り出すか。
