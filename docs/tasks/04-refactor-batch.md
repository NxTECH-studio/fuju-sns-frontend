# リファクタ Batch 消化（P0〜P2 + P3 自律判断）

## 概要

`docs/tasks/03-refactor-backlog.md` の P0〜P2 項目を一気に消化する単一タスク。backend 依存項目は記録のみでスキップし、P3 項目はエイヤ・オア・ライトで自律判断する。`feat/fuju-sns-frontend` (PR #5) を base にした新ブランチ `refactor/backlog-sweep` で作業し、PR #5 とは独立してレビューできる別 PR を切る。

## 背景・目的

- PR #5 は機能スコープとして完結しているが、「保守性に効く技術債」を複数件 Info 指摘のまま残した。機能追加のたびに新しい重複やレイヤ違反を生む素地を先に潰す。
- 寝ている間に自律実行する前提。設計判断が必要な箇所は**標準オプションを先に決めてから**実装に入る（途中で止まらないため）。
- PR は #5 とは別にして、機能追加と保守性改修を分けて履歴に残す。

## スコープ確定事項

### 実装対象

| ID | 項目 | 方針 |
|---|---|---|
| P0-1 | `useAbortableResource` 抽出 | `(fetcher, deps) => { data, loading, error, reload }` の共通フック。cursor ページング不要な 3 hook を移行。`usePagedList` は初回ロード部分のみ委譲を試み、無理なら据え置き。 |
| P0-2 | ESLint でレイヤ境界静的強制 | `eslint-plugin-import` の `no-restricted-paths` で 4 ゾーン禁止。ついでに `.js/.jsx` カバー拡張と `eslint-config-prettier` 適用。 |
| P0-3 | VM 入力型導入 | `CreatePostInput` / `UpdateProfileInput` / `CreateBadgeInput` / `UpdateBadgeInput` / `GrantBadgeInput` (camelCase) を services に追加し、hook 境界を VM へ寄せる。 |
| P1-4 | `useTimelineController` 集約 | `useTimeline` + delete ハンドラ + like 変更を束ねる。PostDetail 用は `usePostDetailController` として別建て。 |
| P1-5 | `AsyncView` 抽象 | `loading / error / empty / list` を 1 コンポーネントで吸収。対象 10+ 箇所を置換。 |
| P1-6 | Admin 配下 CSS Module | `AdminBadgesRoute` / `AdminUserBadgesRoute` の inline style を `.module.css` へ。レイアウト glue だけ inline に残す。 |
| P1-7 | AdminBadges `?grant=<key>` 導線 | 「ユーザーに付与」ボタンに query を付与、遷移先で初期値反映。 |
| P1-8 | Admin ユーザー一覧検索 (FE only) | `listUsers` の offset ページング + client-side filter（表示名 / display_id / sub の前方一致）。swagger に search がないので FE 側で吸収。 |
| P1-9 | `useMeReady` 派生フック | `MeVM \| null` を返す薄い派生。主要 5 箇所で置換。 |
| P2-10 | `erasableSyntaxOnly` 削除理由を README に記録 | `README.md` のトラブルシュート節に 1 段落追記。 |
| P2-11 | husky + lint-staged 実働化 | `.husky/pre-commit` に `lint-staged` を登録、`prepare` を `"husky"` に統一。ステージ時に `eslint --fix` + `prettier --write` が走る状態にする。 |
| P2-12 | PostCard 画像 onError フォールバック | `<img onError={...}>` で壊れた公開 URL をプレースホルダに差し替える小ユーティリティ追加。 |
| P2-14 | AppRoot `loadingFallback` 統一 | `<p>読み込み中...</p>` を `EmptyState` 相当の見た目に寄せる。 |

### スキップ対象（理由付きで backlog 03 に残す）

| ID | 項目 | スキップ理由 |
|---|---|---|
| P2-13 | followers_count / following_count を `PublicUser` に載せる | backend swagger 変更が必要。当 PR では範囲外。|
| P3-15 | `TimelineView` 統合コンポーネント | P1-4 実施後に残る重複を見てから再評価。現時点で抽象化前倒しは YAGNI。|
| P3-16 | `FollowControl` key 再マウント戦略の撤去 | P2-13 (backend 拡張) 待ち。 |
| P3-17 | `MeProvider` ステートマシン化 | P1-9 `useMeReady` で主要な痛みが解ける見込み。追加の state machine は過剰設計。|

上記スキップは `docs/tasks/03-refactor-backlog.md` の各項目に「→ 04 でスキップ判断（理由: ...）」注記を追加して履歴を残す。

## 影響範囲

### 新規追加
- `src/hooks/useAbortableResource.ts` / `useTimelineController.ts` / `usePostDetailController.ts` / `useMeReady.ts`
- `src/ui/components/AsyncView.tsx` (+ module.css)
- `src/ui/components/SafeImage.tsx` (img onError fallback)
- `src/routes/admin/AdminBadges.module.css` / `AdminUserBadges.module.css`
- `src/services/vmInputs.ts`（`CreatePostInput` 等の入力 VM 型）
- `src/services/inputMappers.ts`（VM → swagger snake_case の逆マッパー）
- `.husky/pre-commit`

### 変更
- `src/hooks/useUserProfile.ts` / `useImages.ts` / `useAdminBadges.ts` — `useAbortableResource` に乗せ換え
- `src/hooks/usePostActions.ts` / `useAdminBadges.ts` / `useProfileEdit.ts` — VM 入力型を受けるシグネチャに変更
- `src/routes/HomeTimelineRoute.tsx` / `GlobalTimelineRoute.tsx` / `UserProfileRoute.tsx` / `PostDetailRoute.tsx` / `FollowListRoute.tsx` / `ImagesRoute.tsx` — `useTimelineController` / `AsyncView` / `useMeReady` 利用
- `src/routes/admin/AdminBadgesRoute.tsx` / `AdminUserBadgesRoute.tsx` — CSS Module 化 + `?grant=` 対応 + ユーザー検索 UI 追加
- `src/ui/components/PostCard.tsx` — `SafeImage` 利用
- `src/AppRoot.tsx` — `loadingFallback` を `EmptyState` に
- `eslint.config.js` — `no-restricted-paths`、`.js/.jsx` カバー、`eslint-config-prettier` 適用
- `package.json` — `eslint-plugin-import` / `eslint-import-resolver-typescript` 追加（必要なら）、`prepare: "husky"`、lint-staged 調整
- `README.md` — トラブルシュート節追加
- `docs/tasks/03-refactor-backlog.md` — 本タスクで消化した項目に ✅ を、スキップに理由注記を追加

### 破壊的変更
- `usePostActions.create` / `useProfileEdit.submit` / `useAdminBadges.create/update/grant` の引数型が camelCase VM に変わる。呼び出し側（routes）は本 PR 内で追従。外部から使っているコードは無い。

### 影響の出ない領域
- backend / swagger（touch しない）
- `src/auth-component/`（submodule、別リポ）
- 既存 VM の出力 shape（`PostVM` 等）は変えない

## ブランチ / PR 戦略

- 作業ブランチ: `refactor/backlog-sweep`（origin/feat/fuju-sns-frontend から派生 → HEAD = ae44cb7）
- base: `develop`
- PR #5 がマージされる前は、GitHub 上で diff が膨らんで見える可能性がある。その場合 PR 本文で「PR #5 マージ後に rebase する」と明記。
- マージ順: PR #5 → 本 PR の順で develop に入れる。

## 実装ステップ

P0（基盤保護） → P1（摩擦解消） → P2（仕上げ）の順で、各 batch 末に commit + 検証。

### Step 0: ブランチ作成と依存整備

1. `git checkout -b refactor/backlog-sweep` (HEAD = ae44cb7)
2. `npm install --save-dev eslint-plugin-import eslint-import-resolver-typescript eslint-config-prettier`（未導入なら）
3. 疎通: `npm run lint && npx tsc -b && npm run build` が現状通ることを確認。

### Step 1: P0-2 ESLint 境界強制（最初に置く）

**目的**: 以降のリファクタで境界違反を入れないようにガードを先にかける。

1. `eslint.config.js` を更新:
   - `files` を `['**/*.{ts,tsx,js,jsx}']` に拡張
   - `extends` に `eslint-config-prettier` を追加
   - `import/no-restricted-paths` ルールで以下を禁止:
     - `src/ui/**` から `src/api/**` / `src/hooks/**` / `src/state/**` / `src/services/**` への import
     - `src/api/**` から `src/hooks/**` / `src/state/**` / `src/ui/**` / `src/routes/**` への import
     - `src/services/**` から `src/hooks/**` / `src/state/**` / `src/ui/**` / `src/routes/**` への import
     - `src/state/**` から `src/ui/**` / `src/routes/**` への import（ui-primitive 経由ではない直接参照を禁止）
   - submodule `src/auth-component/**` は ignore
2. 現状の違反を lint で検出 → 0 件想定（02 プランで守っているはず）。もし出たら修正。
3. commit: `chore(lint): enforce layer boundaries via import/no-restricted-paths`

**動作確認**: 試しに `ui/primitives/Button.tsx` から `../../api/client` を import する patch を当てて `npm run lint` が fail することを確認（確認後 revert）。

### Step 2: P0-1 `useAbortableResource` 抽出

1. `src/hooks/useAbortableResource.ts` を新設:
   ```ts
   export interface AbortableResourceState<T> {
     data: T | null;
     loading: boolean;
     error: string | null;
     reload: () => void;
     setData: (updater: (prev: T | null) => T | null) => void;
   }

   export function useAbortableResource<T>(
     fetcher: (signal: AbortSignal) => Promise<T>,
     deps: ReadonlyArray<unknown>,
   ): AbortableResourceState<T>;
   ```
2. `useUserProfile.ts` / `useImages.ts` / `useAdminBadges.ts` を移行。
3. `usePagedList.ts` は「初回 fetch + reload」部分を `useAbortableResource` に乗せることを試みる。`loadMore` のカーソル管理は残す。可能なら P0-1 の範囲内で、困難なら注記して `usePagedList` は据え置き。
4. `usePostDetail.ts` も「Promise.all での初回ロード」部分を `useAbortableResource<{post, replies, nextCursor}>` で置き換える。loadMoreReplies は残す。
5. commit: `refactor(hooks): extract useAbortableResource and migrate resource hooks`

### Step 3: P0-3 VM 入力型導入

1. `src/services/vmInputs.ts` を新設し、以下を camelCase で定義:
   - `CreatePostInput { content; imageIds?; parentPostId? }`
   - `UpdateProfileInput { bio?; bannerUrl? }`
   - `CreateBadgeInput { key; label; description?; iconUrl?; color; priority }`
   - `UpdateBadgeInput { label?; description?; iconUrl?; color?; priority? }`
   - `GrantBadgeInput { badgeKey; expiresAt?; reason? }`
2. `src/services/inputMappers.ts` に `fromCreatePostInput` 等、VM → swagger request への変換を定義。
3. `usePostActions.create(input: CreatePostInput)` に変更。内部で `fromCreatePostInput` を通す。
4. `useProfileEdit.submit(input: UpdateProfileInput)` に変更。
5. `useAdminBadges.create/update/grant` を VM 入力型へ。
6. routes 側（`HomeTimelineRoute`, `PostDetailRoute`, `MyProfileEditRoute`, `AdminBadgesRoute`, `AdminUserBadgesRoute`, `ComposerBox`）の snake_case キー組み立てを除去。
7. commit: `refactor(services): introduce VM input types to remove snake_case from routes`

### Step 4: P1-5 `AsyncView` 抽象化

1. `src/ui/components/AsyncView.tsx` を新設:
   ```tsx
   interface AsyncViewProps<T> {
     loading: boolean;
     error: string | null;
     isEmpty: boolean;
     emptyFallback: ReactNode;
     loadingFallback?: ReactNode;   // default: 「読み込み中...」
     children: ReactNode;
   }
   ```
2. 対象ルート（Home / Global / UserProfile / PostDetail / Follow / Images / AdminBadges / AdminUserBadges）でネスト三項を `<AsyncView>` に置換。
3. commit: `refactor(ui): extract AsyncView to flatten loading/error/empty triage`

### Step 5: P1-9 `useMeReady`

1. `src/hooks/useMeReady.ts` を新設:
   ```ts
   export function useMeReady(): MeVM | null {
     const me = useMe();
     return me.status === 'ready' ? me.me : null;
   }
   ```
2. `HomeTimelineRoute` / `GlobalTimelineRoute` / `PostDetailRoute` / `UserProfileRoute` / `RootLayoutRoute` で `meSub` 取得箇所を `useMeReady()` に置換。
3. `MyProfileEditRoute` は `me.status` を複数参照するので `useMe()` のまま据え置き。
4. commit: `refactor(hooks): add useMeReady derivative hook`

### Step 6: P1-4 `useTimelineController` 集約

1. `src/hooks/useTimelineController.ts` を新設:
   ```ts
   export function useTimelineController(kind: TimelineKind, userSub?: string) {
     const timeline = useTimeline(kind, userSub);
     const actions = usePostActions();
     const toast = useToast();
     // handleDelete / handleLikeChange を返す
   }
   ```
2. Home / Global / UserProfile のタイムライン画面から `handleDelete` / `onLikeChange` のインラインロジックを除去、controller 経由に。
3. `usePostDetailController.ts` を新設し、PostDetail 固有のロジック（返信追加・削除・like 同期）を集約。
4. commit: `refactor(routes): introduce useTimelineController and usePostDetailController`

### Step 7: P1-6 Admin CSS Module

1. `src/routes/admin/AdminBadges.module.css` / `AdminUserBadges.module.css` を新設。
2. AdminBadges / AdminUserBadges の inline `style={{...}}` をクラス化。残すのは 1-2 箇所の layout glue（例: `marginTop` 1 箇所）まで。
3. commit: `refactor(admin): move admin inline styles to CSS modules`

### Step 8: P1-7 `?grant=<key>` 導線 + P1-8 ユーザー一覧検索

1. `AdminBadgesRoute`: 「ユーザーに付与」ボタンを `navigate('/admin/users?grant=' + encodeURIComponent(b.key))` に変更。
2. `AdminUserBadgesRoute`:
   - `useSearchParams()` で `?grant=` を読み、初期 `badgeKey` に反映。
   - 新規フック `useUsers({ limit=20, offset=0 })` で offset ページング。
   - 上部に「ユーザー一覧 + フィルタ input」を配置。フィルタは client-side で `displayName` / `displayId` / `sub` の contains 一致。
   - 一覧行クリックで `targetSub` 設定。sub 手入力欄は fallback として下に残す（詳細表示）。
3. commit: `feat(admin): wire badge grant handoff and paginated user picker`

### Step 9: P2-12 `SafeImage`

1. `src/ui/components/SafeImage.tsx` を追加:
   ```tsx
   interface SafeImageProps extends ImgHTMLAttributes<HTMLImageElement> {
     fallback?: ReactNode;
   }
   ```
   `onError` 発火時に state で fallback に切り替え。`isSafeHttpUrl` と組み合わせる。
2. `PostCard` の画像、`ImageGallery` の画像、`UserProfileView` のバナー用途を検討。バナーは `backgroundImage` なので別問題、画像リスト系に適用。
3. commit (P2 batch に含める): 下記 Step 11 で集約。

### Step 10: P2-14 AppRoot `loadingFallback` 統一

1. `AppRoot.tsx` の `loadingFallback` を `<EmptyState title="読み込み中..." />` に変更。

### Step 11: P2-10 README / P2-11 husky

1. `README.md` に「Troubleshooting / Dev notes」節を追加し、`tsconfig.app.json` から `erasableSyntaxOnly` を外した理由（auth-component submodule がパラメータプロパティを使用）を 1 段落で記録。
2. `.husky/pre-commit` を作成 (`npx lint-staged`)。
3. `package.json` の `prepare` を `"husky"`（v9 形式）に変更、必要なら `husky` のメジャーバージョン更新。
4. 動作確認: ダミー変更 → `git add` → 実際には commit せずに `npx lint-staged` を直接実行して pipeline が走ることを確認。
5. commit: `chore(tooling): wire husky pre-commit, document erasableSyntaxOnly, polish loadingFallback, add SafeImage`

### Step 12: 最終検証 + backlog 更新

1. `npm run lint` / `npx tsc -b` / `npm run build` が全部通ることを確認。
2. `docs/tasks/03-refactor-backlog.md` を更新:
   - 実装済み項目に ✅ と実装タスクへの逆参照（「→ 04 で完了」）
   - スキップ項目に「→ 04 でスキップ判断: <理由>」
3. commit: `docs: mark backlog 03 items resolved or deferred`

### Step 13: push + PR 作成

1. `git push -u origin refactor/backlog-sweep`
2. `gh pr create --base develop` で PR 作成。本文:
   - 概要: PR #5 の Info 指摘 + 技術債を一括返済
   - batch ごとの commit リスト
   - スキップ理由
   - 「PR #5 マージ後に rebase する」明記

## テスト要件

- 自動テストは導入しない（02 プランで MVP 範囲外と合意済み）。
- 各 Step 末に `npm run lint` と `npx tsc -b` が通る状態を保つ。
- `npm run build` は Step 12 で実行。
- 境界チェック（Step 1）の動作確認は、テスト patch で lint が fail することを確認 → revert の手順で明示的に行う。

### 手動動作確認（任意、PR 作成後に確認）

- ログイン → 各タイムライン / 投稿 / like / follow / プロフィール編集 / 画像アップロード / Admin バッジ付与が、リファクタ前と同じ挙動であること
- Admin で「ユーザーに付与」→ `?grant=` 経由で badge_key が初期入力されていること
- Admin ユーザー一覧で検索フィルタが効くこと
- Home ページで画像読込失敗 URL を混ぜると `SafeImage` のプレースホルダが出ること

## 技術的な補足

### 自律実行時の決定事項（迷ったらこれで進める）

1. **ESLint 依存追加**: `eslint-plugin-import` / `eslint-import-resolver-typescript` / `eslint-config-prettier` を devDependency に追加。flat config と互換のバージョンを選ぶ（`eslint-plugin-import` は `^2.x` の最新）。
2. **`useAbortableResource` の shape**: 返却を `{ data, loading, error, reload, setData }` に統一。`setData` は楽観更新用の脱出ハッチとして公開する（useImages の upload/remove, useAdminBadges の create/update が必要）。
3. **`AsyncView` の loading UX**: ローディング中はスケルトン相当は作らず、テキスト「読み込み中...」で統一（MVP 範囲維持）。
4. **VM 入力型の命名**: サフィックスは `Input`（`PostVM` の出力側 `VM` と被らないように意識）。
5. **`useTimelineController` の返り値**: `{ timeline, composer: { onSubmit }, row: { onDelete, onLikeChange } }` の入れ子にする。routes 側は `<PostRow {...controller.row} ... />` のように流す。
6. **Admin ユーザー検索**: `listUsers` は `limit=20, offset=N` を使う。検索フィルタは **クライアント側のみ**（server search なし）。page 数が 5 を超える規模になったら backend 拡張を backlog に追加する旨を README に一行残す。
7. **`SafeImage` 適用範囲**: 初回は `PostCard` の画像リスト / `ImageGallery` の画像 / Admin badge の icon 表示だけ。`UserProfileView` のバナー（CSS background）は別経路なので今回はスコープ外。
8. **P3 判断の最終結論**:
   - P3-15 TimelineView: P1-4 実装後に `Home/Global/UserProfile` の timeline 部分の差分を見る。**`<PostRow>` を map するだけの 10 行以下に収束していれば抽象化しない**。超えていれば `<PostList controller={...} />` を作る。自律的に判断する。
   - P3-16 FollowControl key 戦略: backend 拡張待ちなので本 PR では touch しない。
   - P3-17 MeProvider ステートマシン: `useMeReady` を導入するので本 PR では無触で良しとする。

### 失敗時のフォールバック

- Step 2 (`useAbortableResource`) で `usePagedList` の移行が難しいと判断したら、usePagedList は据え置きで他の 3 hook のみ移行する。task doc の該当項目にその旨を追記。
- Step 8 (ユーザー検索) で `listUsers` が想定通り動かない場合、`offset` ページング UI だけ入れて client filter は省略する。
- Step 11 (husky) で husky v9 移行が破壊的なら、`.husky/pre-commit` 追加のみに留めて `prepare` は既存のまま残す。

### PR マージ後のフォローアップ

- backlog 03 の残項目（P2-13, P3-15, P3-16, P3-17）は個別に `/create-task` で起こす。いずれも backend 依存 or P3 再評価。

## 未確定事項

特になし（すべて自律判断でゴーとした）。もし実行中に想定外の障害（例: 依存ライブラリの API 非互換）が出たら、対応方針を commit メッセージに明記して進む。
