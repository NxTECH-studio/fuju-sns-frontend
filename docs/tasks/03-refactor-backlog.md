# Fuju SNS Frontend リファクタ Backlog

> **Status (2026-04-21)**: 13 件を `refactor/backlog-sweep` ブランチで消化（タスク `04-refactor-batch.md` 参照）。残っているのは backend 依存 1 件と P3 設計議論 3 件のみ。各項目の `Status:` 欄を参照。

## 概要

PR #5（`feat/fuju-sns-frontend` → `develop`）でマージ予定の Phase 0〜7 実装について、コードレビューで Info レベル指摘として送った改善候補と、実装中に気づいたが優先度判断で見送った技術債を一覧化する。優先順位は**保守性・技術債返済**を主軸に P0〜P3 を付ける。

## 背景・目的

- 02 の実装は手動動作確認で動く状態まで持ち込んだが、レイヤ分離の原則を強制する仕組み（ESLint）や、ルート間で重複するグルーコード、hook の重複テンプレートなど、**今後機能を足すたびに利息が発生する箇所**が残っている。
- 機能追加のたびに「もう 1 ルート同じインライン style を書く」「もう 1 hook で AbortController + tick を手書きする」状態になるのを避けたい。
- 本 backlog は「次に機能追加をする前に返しておきたい技術債」を集約する。PR #5 のブロッカーではないので逐次対応。

## 影響範囲

### 変更対象になる可能性のあるもの

- `src/hooks/` — 4 hook の共通テンプレート抽出、VM 入力型対応
- `src/routes/` — 重複グルー集約、Admin 配下の CSS Module 化、ユーザー検索 UI 追加
- `src/ui/components/` — `AsyncView`（loading/error/empty 3 状態の抽象）追加の可能性
- `src/services/vm.ts` / `mappers.ts` — 入力側 VM 型の追加
- `eslint.config.js` — 境界違反を静的チェックする設定追加
- `tsconfig.app.json` — 削除済みフラグのコメント追加

### 変更対象にならないもの

- バックエンド swagger（別タスク議論）
- `src/auth-component/` submodule（別リポ）
- 既存の VM / mapper 出力側の shape（既に安定）

## バックログ（P0 → P3）

### P0 — 基盤保護・今すぐ返さないと利息が膨らむ

#### 1. `useAbortableResource` 抽出

- **Status**: ✅ 04 で完了（`useUserProfile` / `useImages` / `useAdminBadges` / `useUsers` の 4 hook を移行。`usePagedList` / `usePostDetail` は cursor ページング固有ロジックのため据え置きと判断）
- **現状**: `usePagedList` / `usePostDetail` / `useUserProfile` / `useImages` / `useAdminBadges` の 5 hook で、以下の同じパターンを手書きしている。
  - `AbortController` ref
  - `tick` state による手動 reload
  - `setLoading(true) → fetch → setState → abort/error` の定型
  - `isAbortError` ガード
- **やること**:
  - `src/hooks/useAbortableResource.ts` を新設し、`(fetcher, deps) => { data, loading, error, reload }` のインターフェースで共通化。
  - 5 hook のうち **cursor ページング不要な 3 hook**（`useUserProfile` / `useImages` の一部 / `useAdminBadges`）をこれに乗せ換える。
  - `usePagedList` はページング固有ロジックを残しつつ、初回ロード部分だけ `useAbortableResource` に委譲できないか検討。できなければ P1 に格下げして方針差し替え。
- **完了条件**: 該当 hook の `AbortController + tick + isAbortError` ボイラプレートがゼロ。lint / build 通過。
- **備考**: 抽出できれば今後の新 hook（例: 通知、検索）もこのパターンに乗れる。

#### 2. ESLint で レイヤ境界を静的強制

- **Status**: ✅ 04 で完了（`eslint-plugin-import` の `no-restricted-paths` でゾーン制約を導入。VM 型 / pure utility は `src/types/` / `src/utils/` に移して境界をクリーンに）
- **現状**: 02 プランの最重要原則「`ui/**` から `api/hooks/state/services` への import 禁止」は目視レビューのみで保証している。
- **やること**:
  - `eslint-plugin-import` の `no-restricted-paths` 相当、もしくは `eslint.config.js` の custom zones で:
    - `src/ui/**` → `src/api/**` / `src/hooks/**` / `src/state/**` / `src/services/**` 禁止
    - `src/api/**` → `src/hooks/**` / `src/state/**` / `src/ui/**` / `src/routes/**` 禁止
    - `src/services/**` → `src/hooks/**` / `src/state/**` / `src/ui/**` / `src/routes/**` 禁止
  - 違反があれば潰してから commit。
- **完了条件**: 上記 4 ルール追加 + `npm run lint` 通過 + 禁止 import が残っていない。
- **備考**: `eslint.config.js` が `.js` をカバーしていない件もついでに修正（`files: ['**/*.{ts,tsx,js,jsx}']`）。`eslint-config-prettier` を `extends` に追加して stylistic ルールの prettier との衝突を防ぐ。

#### 3. VM 入力型の導入（`usePostActions` / `useAdminBadges` / `useProfileEdit`）

- **Status**: ✅ 04 で完了（`src/types/vmInputs.ts` + `src/services/inputMappers.ts` で camelCase VM を受け取り、routes から snake_case リテラルを駆逐）
- **現状**: `usePostActions.create` が `CreatePostRequest`（snake_case: `image_ids`, `parent_post_id`）を受け取り、routes 側で snake_case キーを組み立てている。`useAdminBadges` / `useProfileEdit` も同様。
- **やること**:
  - `src/services/vm.ts` に入力型を追加: `CreatePostInput` / `UpdateProfileInput` / `CreateBadgeInput` / `UpdateBadgeInput` / `GrantBadgeInput`（camelCase）。
  - `src/services/mappers.ts` に `fromCreatePostInput(vm): CreatePostRequest` 等を追加。
  - hook の公開型を VM 側に揃え、routes 側の snake_case 組み立てを除去。
- **完了条件**: routes 内に `image_ids` / `parent_post_id` / `icon_url` / `badge_key` 等の snake_case リテラルが出現しない。lint / build 通過。

### P1 — 摩擦が目に見える・次の機能追加で必ず当たる

#### 4. `handleDelete` / `onLikeChange` 重複集約

- **Status**: ✅ 04 で完了（`useTimelineController` + `usePostDetailController` 新設。Home / Global / UserProfile / PostDetail から重複グルーを除去）
- **現状**: 5 ルート（Home / Global / UserProfile / PostDetail / Images）で投稿削除ハンドラと like 変更ハンドラがほぼコピペ（~40 行 × 5）。
- **やること**: `src/hooks/useTimelineDeleteHandler.ts` + `useLikeChangeAdapter` のような小さな集約フック、または高階の「`useTimelineController(kind, subOrNull?)`」を作る。
  - `useTimelineController` は `useTimeline` を内包し、`onDelete` / `onLikeChange` を返す。routes はそれを直接 `PostRow` に流すだけ。
- **完了条件**: 上記 5 ルートから削除・like 連携ハンドラの本体が消え、`useTimelineController` 経由で解決される。
- **備考**: PostDetail は timeline ではないので `usePostDetailController` が別に必要。

#### 5. `AsyncView` 抽象で 3 段ネスト三項を解消

- **Status**: ✅ 04 で完了（`src/ui/components/AsyncView.tsx` 新設。Home / Global / UserProfile / Follow / AdminBadges のネスト三項を置換）
- **現状**: `loading → error → empty → list` の 4 状態を、全ルートで三項演算子ネストで書いている（10+ 箇所）。
- **やること**: `src/ui/components/AsyncView.tsx` を presentational コンポーネントとして追加。
  ```tsx
  <AsyncView
    loading={timeline.loading}
    error={timeline.error}
    empty={timeline.items.length === 0}
    emptyFallback={<EmptyState ... />}
  >
    {timeline.items.map(...)}
  </AsyncView>
  ```
- **完了条件**: 対象ルートのネスト三項が `<AsyncView>` 呼び出しに置き換わる。
- **備考**: `loading` 状態のプレースホルダ（スケルトン等）もここで統一できる。

#### 6. Admin 配下の inline style → CSS Module 化

- **Status**: ✅ 04 で完了（`AdminBadges.module.css` / `AdminUserBadges.module.css` 新設、inline style をクラス化）
- **現状**: `AdminBadgesRoute.tsx` と `AdminUserBadgesRoute.tsx` で inline `style={{...}}` が 19 箇所（`grep -c` 実測）。レイアウトのグルー用途を超えて、画面固有デザインまで inline で書いている。
- **やること**:
  - `src/routes/admin/AdminBadges.module.css` / `AdminUserBadges.module.css` を追加し、該当レイアウトを CSS Module に寄せる。
  - 同時に `.list` / `.listItem` / `.targetCard` / `.badgesSection` 等の semantic なクラスに整理。
- **完了条件**: Admin 配下の inline style が layout glue（例: `marginTop: 8`）のみ、または 3 箇所以下に。

#### 7. `AdminBadgesRoute`「ユーザーに付与」導線を badge_key 付きで飛ばす

- **Status**: ✅ 04 で完了（`?grant=<key>` クエリで引き渡し、`useSearchParams` で初期値反映）
- **現状**: 「ユーザーに付与」ボタンが `/admin/users` に遷移するだけで、対象 badge 情報を渡していない。AdminUserBadgesRoute でユーザーの sub 手入力 + badge_key 手入力になる。
- **やること**:
  - `/admin/users?grant=<badge_key>` のクエリパラメータを受け取り、AdminUserBadgesRoute の `badgeKey` state を初期化。
  - ボタン側は `navigate('/admin/users?grant=' + encodeURIComponent(b.key))`。
- **完了条件**: AdminBadges から遷移した直後、AdminUserBadges の badge_key 欄に対象 key が入力済み。

#### 8. Admin: `listUsers` を使った簡易ユーザー検索 UI

- **Status**: ✅ 04 で完了（`useUsers` フック + offset ページング + client-side filter を AdminUserBadgesRoute に配置。sub 手入力は下部に降格）
- **現状**: `AdminUserBadgesRoute` は対象ユーザーの sub を **手入力** (ULID 26 文字)。実用にならない。
- **やること**:
  - `useUsers({ limit, offset, search? })` 的なフック（`api/endpoints/users.ts` の `listUsers` を包む）を追加。
  - `AdminUserBadgesRoute` の上部に軽い offset ページング付きユーザー一覧を出し、クリックで `targetSub` を設定。
  - swagger に `search` パラメータが無いので、現状は offset ページング + クライアント側フィルタでしのぐ。
- **完了条件**: sub 手入力 UI が fallback に降格し、一覧からのクリック選択が主経路になる。

#### 9. `useMeReady()` 派生フック

- **Status**: ✅ 04 で完了（`src/hooks/useMeReady.ts` 新設、Home / Global / UserProfile / PostDetail で置換）
- **現状**: 6 ファイルで `if (me.status !== 'ready') ... else me.me` のガードが散在。`me.status === 'ready'` の条件記述を 7 箇所で書いている。
- **やること**:
  - `src/hooks/useMeReady.ts` を追加し、`MeVM | null` を返す（`ready` 以外はすべて null）。
  - 「認証済みのときだけ meSub が欲しい」ユースケースで薄く使う。`MeState` の full 情報が要る画面（MyProfileEdit）は従来 `useMe()` を使う。
- **完了条件**: 対象の 7 箇所中、少なくとも 5 箇所が `useMeReady()` 経由に移行。

### P2 — あると嬉しい・見える場所の小さな摩擦

#### 10. `tsconfig.app.json` で `erasableSyntaxOnly` を外した理由のコメント

- **Status**: ✅ 04 で完了（`README.md` の Dev notes 節に記録）
- **現状**: `tsconfig.app.json` に JSON コメントは書けないが、`docs/tasks/02-*` に記録が残っているのみ。将来触った人が意味を忘れる。
- **やること**: ルート `README.md` もしくは `tsconfig.json`（references ファイル）のトップレベルコメントで「auth-component submodule がパラメータプロパティを使うため」の経緯を残す。
- **完了条件**: grep で経緯が引ける。

#### 11. lint-staged + husky の実働確認

- **Status**: ✅ 04 で完了（`.husky/pre-commit` を作成、`npx lint-staged` が実行されることを手動確認）
- **現状**: `package.json` に `lint-staged` 設定 + husky 依存があるが、code-review で「prettier 未整形の新規ファイルが 87 件残っていた」ので実際には動いていない疑い。
- **やること**:
  - `npx husky install` が `prepare` で走る経路になっているか確認、`.husky/pre-commit` に `lint-staged` を登録。
  - ローカルで `git commit` を試して pre-commit が走ることを確認。
- **完了条件**: ステージした `.ts` ファイルに対して commit 時に自動で `eslint --fix` + `prettier --write` が走る。

#### 12. PostCard 画像の失敗フォールバック

- **Status**: ✅ 04 で完了（`src/ui/components/SafeImage.tsx` 新設、`PostCard` の画像に適用）
- **現状**: `<img src={image.publicUrl}>` は読み込み失敗時に alt を見せない状態。壊れた画像アイコンのまま。
- **やること**: `onError` で `publicUrl` を null 化し、プレースホルダ（`Avatar` の fallback 相当）に切り替える小ユーティリティを追加。
- **完了条件**: 404 を返す公開 URL を差し込んでも壊れたアイコンが出ない。

#### 13. `UserProfileView` の followingCount 表示

- **Status**: ⏸ 04 でスキップ（backend swagger 依存。`PublicUser` に `followers_count` / `following_count` が追加されるまで凍結）
- **現状**: swagger が `/users/:sub` で followers_count / following_count のいずれも返さないため、followers は toggle 後の値、following は `→` プレースホルダ固定。
- **やること**:
  - backend 側に `public_user.followers_count` / `following_count` を追加依頼（swagger 更新提案を別タスクに切り出し）。
  - FE は swagger が更新されたら `UserVM` に `followersCount` / `followingCount` を足して初期値に使う。
- **完了条件**: `/users/:sub` 画面初期描画時点で正しい数値が見える。
- **備考**: backend 待ちなので実装は凍結、タスクとして記録のみ。

#### 14. AppRoot `loadingFallback` の `EmptyState` 化

- **Status**: ✅ 04 で完了
- **現状**: `<p style={{ padding: 24 }}>読み込み中...</p>` とプレーンな p タグ。
- **やること**: `EmptyState` を使って他画面と見た目を揃える。
- **完了条件**: 視覚的統一。

### P3 — 設計議論・将来の選択肢

#### 15. `<TimelineView>` 統合コンポーネント

- **Status**: ⏸ 04 でスキップ判断（`useTimelineController` + `AsyncView` 導入後、各ルートの timeline 部分は `.map(p => <PostRow />)` + `<Pager />` の 15 行程度に収束。抽象化による追加メリットは少ないので YAGNI で見送り。機能追加で再び重複が出てきたら再評価）
- Home / Global / UserProfile / PostDetail 返信の 4 箇所でタイムライン描画ループが繰り返されている。`PostRow` の上の層で「PostVM[] を受け取って描画 + load more + delete ハンドラ配線」まで束ねる統合コンポーネントを作る余地。
- P1 #4 #5 を両方やった後に効果を再評価。先走って抽象化しないこと。

#### 16. `FollowControl` の key 再マウント戦略見直し

- **Status**: ⏸ 04 でスキップ判断（#13 の backend 拡張待ち。それまで現行の key 戦略で問題なし）
- `UserProfileRoute` で timeline の `following_author` から推定し、readiness で `<FollowControl key={...}>` を remount することで初期値を差し替えている。hack ではあるが swagger がくれない以上これで良い。#13（backend 拡張）が入ったら `useFollowToggle` が props ドリブンに変わるので、この key 戦略自体を撤去できる。
- #13 の進捗次第。

#### 17. `MeProvider` のステートマシン化

- **Status**: ⏸ 04 でスキップ判断（`useMeReady` 導入で主要な痛みが解消。追加の state machine 化は過剰設計と判断）
- `MeState` が `idle | loading | ready | unauthenticated | error` の 5 状態、`useAuthStatus().status` も類似の 6 状態、routes 側でどちらを見るかが場所により混在。1 つの状態機械として整理する案もあるが、現状で混乱は起きていないので優先度は低い。

## 実装ステップ（推奨順）

保守性の軸で「効いてくる順」に並べると:

1. **P0-2 ESLint 境界強制** — まずレイヤ違反を検出できる地面を作る（以降の改修で不用意に越境しないため）
2. **P0-1 `useAbortableResource`** — 4 hook の重複を片付け、今後の hook 追加コストを下げる
3. **P0-3 VM 入力型** — routes からの snake_case 露出を断つ
4. **P1-4 `useTimelineController`** — 5 ルートの重複グルーを集約（VM 入力型に依存するため P0-3 の後）
5. **P1-5 `AsyncView`** — 3 段ネスト三項を解消（#4 と並行でも OK）
6. **P1-6 Admin CSS Module** — 独立性が高いので並行で進められる
7. **P1-9 `useMeReady`** — 小さく、いつでも
8. **P1-7 / P1-8 Admin 動線 / ユーザー検索** — 機能的小改修、UX 向上
9. **P2 全般** — 余裕があれば

各 P0 / P1 項目は独立タスクとして `/create-task` から起こし、`/start-with-plan` で消化する想定。本 backlog は「次にどれを拾うか」の棚卸し表として維持する。

## テスト要件

- 本 backlog 自体には自動テスト要件はない。
- 各項目の実装タスクは PR 時に `npm run lint` / `npx tsc -b` / `npm run build` が通ること + 影響範囲の手動動作確認を求める。
- P0-2（ESLint 境界強制）実装後は、禁止 import を試しに書いて lint が落ちることを確認する。

## 技術的な補足

### 優先度の付け方

「保守性・技術債返済優先」軸で付けた。具体的には:

- **P0**: 将来の機能追加の**ほぼ全部**に影響する基盤。1 ヶ月後の自分 or 他人がハマる。
- **P1**: 今後 2〜3 機能追加するうちに必ず踏む摩擦。
- **P2**: 気にならないが気付くと直したくなる。
- **P3**: アーキテクチャレベルの選択肢。議論してから着手。

### 除外したもの

- **自動テスト導入**（Vitest / Playwright）: 02 プランで明示的に MVP 範囲外。別トラックで議論。
- **i18n**: 02 プランで対象外。
- **a11y 監査 / Lighthouse**: MVP 到達後に別タスク。
- **Storybook / デザインシステム**: 02 プランで対象外、P3 以降。
- **Image / CDN 最適化、パフォーマンスチューニング**: UX 観測してから。
- **AuthCore 連携の拡張**: 現行の `authToken` 公開で足りており、追加要望は submodule 側の issue として扱う。

### 依存関係図（ざっくり）

```
P0-2 (ESLint) ──┐
                ├──> P0-1 (useAbortableResource) ──> P1-4 (useTimelineController) ──┐
P0-3 (VM入力型) ─┘                                                                   ├──> P1-5 (AsyncView)
                                                                                     │
P1-6 (Admin CSS) ← independent                                                       │
P1-7 (Admin 導線) ← independent                                                       │
P1-8 (Admin 検索) ← independent                                                       │
P1-9 (useMeReady) ← independent                                                      │
                                                                                     │
P2 群 ← independent, small
P3 群 ← 先延ばし、#13 は backend 依存
```

P0 の 3 件を片付けると、以降の項目が独立に走らせられる構造になる。
