# 投稿直後にユーザ名が `deleted` になる問題の修正

## 概要

投稿作成直後、Home タイムラインや PostDetail に挿入された自分の投稿の表示名・ユーザIDが
`(deleted)` / `@deleted` になる。リロードすると正しく表示される。
フロント側で `MeProvider` の me 情報から `AuthorVM` を合成し、投稿作成直後の VM を補完して解消する（フロントのみでの対応）。

## 背景・目的

- 症状: 投稿した直後のみ、投稿カードのヘッダが `(deleted) @deleted` と表示される。リロードで解消する。
- バックエンド仕様 (`../backend/docs/swagger.yaml`) では、`POST /posts` は `PostDetailEnvelope`（= hydration 済み `Post`）を返すことになっており、`author` は「投稿作成後にユーザが削除された場合のみ null」という契約。
  - `Post.author` は `nullable: true`
  - `PostAuthor` は `sub` / `display_name_cached` / `display_id_cached` / `icon_url_cached` を `required`
- しかし実挙動は、POST 直後に `author` が null（あるいは空文字を含むレコード）で返り、`src/services/mappers.ts` の `toPostVM` で `author: null` となり、`src/ui/components/PostCard.tsx` のフォールバック（`?? "(deleted)"` / `?? "deleted"`）が発火している。
- リロード時は `GET /posts` / `GET /posts/{id}/replies` 経由で author がジョイン済みで返るため正しく表示される。
- バックエンド側の hydration バグの可能性が高いが、本タスクでは **フロントのみ** で、自分の投稿であれば me 情報から確実に author を埋める方針で対処する。

## 影響範囲

- `src/services/mappers.ts`: `MeVM` → `AuthorVM` 変換ヘルパを追加。
- `src/hooks/usePostActions.ts`: `create()` / 返信の戻り値に me 情報で author を補完するロジックを挿入。
- `src/routes/HomeTimelineRoute.tsx` / `src/routes/PostDetailRoute.tsx`: `handleCreate` / `handleReply` で補完済み VM を受け取って prepend / append する。
  - 補完ロジックを hooks 側に寄せれば、ルート側は変更不要にできる（推奨）。
- `src/ui/components/PostCard.tsx`: 変更なし（フォールバック文言も据え置き）。
- `src/services/vm.ts` / `src/api/types.ts`: 変更なし（型契約は維持）。

破壊的変更なし。

## 実装ステップ

1. `src/services/mappers.ts` に `meToAuthorVM(me: MeVM): AuthorVM` を追加する。
   - `sub` / `displayName` / `displayId` / `iconUrl` を `MeVM` からそのままコピー。
2. `src/hooks/usePostActions.ts` で `MeProvider` の me を参照できるようにする（`useMe()` を import）。
3. 同ファイル内、投稿作成・返信作成直後に取得した `PostVM` に対して次の補完を行うユーティリティ `fillAuthorFromMe(vm, me)` を追加する。
   - 条件: `vm.author === null` かつ `me.status === "ready"` かつ `vm.userId === me.me.sub`
   - 満たす場合のみ `vm.author = meToAuthorVM(me.me)` としたコピーを返す。それ以外はそのまま返す。
4. `create` / 返信作成の戻り値を `fillAuthorFromMe` でラップしてから呼び出し側に返す。呼び出し側の `HomeTimelineRoute.handleCreate` / `PostDetailRoute.handleReply` は既存のまま動く。
5. 手動確認: 投稿直後に `(deleted) @deleted` が出ないことを確認。リロードしても表示が変わらないことを確認。返信でも同様に確認。

## テスト要件

- 手動テスト観点:
  - Home タイムライン: 投稿直後に先頭カードのユーザ名・ID が自分のプロフィール表示と一致する。
  - PostDetail: 返信直後に先頭の返信のユーザ名・ID が一致する。
  - ページリロード後に表示がブレない（= 補完値と GET 応答の author が実質同一）。
  - me が `ready` でないタイミングで投稿した場合でも画面が壊れず、リロードで正しくなる（現状維持）。
- 自動テストは本タスクでは追加しない（テスト基盤未導入）。

## 技術的な補足

- 根本原因はバックエンド側の `POST /posts` ハンドラの hydration だが、本タスクの対応範囲外。バックエンド修正が入っても本フロント修正は冪等に動き、害はない。
- 補完ガードに `vm.userId === me.me.sub` を必ず含める。将来的に代理投稿等の拡張が入った場合にも誤補完を防ぐため。
- `display_name_cached` / `display_id_cached` が空文字で返るパターンに備え、`toAuthorVM` で空文字を受けたときも null 扱いに寄せる案があるが、swagger 上は空文字は想定外のため本タスクではスコープ外。`author: null` のケースのみ補完する。
- 関連ファイル（絶対パス）:
  - `/home/sheep/dev/fuju/frontend/src/services/mappers.ts`
  - `/home/sheep/dev/fuju/frontend/src/services/vm.ts`
  - `/home/sheep/dev/fuju/frontend/src/hooks/usePostActions.ts`
  - `/home/sheep/dev/fuju/frontend/src/routes/HomeTimelineRoute.tsx`
  - `/home/sheep/dev/fuju/frontend/src/routes/PostDetailRoute.tsx`
  - `/home/sheep/dev/fuju/frontend/src/ui/components/PostCard.tsx`
  - `/home/sheep/dev/fuju/backend/docs/swagger.yaml` (参照: `Post` / `PostAuthor` / `PostDetailEnvelope`)
