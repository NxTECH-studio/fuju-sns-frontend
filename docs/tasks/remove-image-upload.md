# 画像アップロード機能の一旦削除

## 概要

フロントエンドから画像アップロード関連の UI と通信コードを削除する。
投稿カードに既存投稿の画像が含まれる場合の表示は残し、ユーザーが新たに画像をアップロード・添付・管理する経路を撤去する。

## 背景・目的

- 現状、画像アップロードは下記 3 経路で露出している。
  1. `/images` ルート（ギャラリー + 一括アップロード/削除）。
  2. ヘッダのナビ「画像」リンク。
  3. `ComposerBox` 内の「画像を添付」ボタン（投稿フォームの画像添付）。
- 一旦これらをまとめて撤去し、画像周りの仕様を再検討するフェーズに入る。
- バックエンドの画像 API は残る前提だが、フロントから呼ばない。投稿表示時に既存の画像 URL が返ってきた場合は素直にレンダリングする（`PostCard` の `post.images` 表示は維持）。
- 「いったん削除」のため、再導入を見越した粒度で撤去するか完全消去するかの判断が必要。本タスクでは **コードを完全に削除** する方針（git 履歴から戻せばよい）。残骸を残すと型・lint メンテのコストが続くため。

## 影響範囲

- 削除（ファイル単位）:
  - `src/routes/ImagesRoute.tsx`
  - `src/ui/components/ImageUploader.tsx`
  - `src/ui/components/ImageGallery.tsx`
  - `src/ui/components/ImageGallery.module.css`
  - `src/hooks/useImages.ts`
  - `src/api/endpoints/images.ts`
- 変更:
  - `src/routes/router.tsx`:
    - `ImagesRoute` の import と `<Route path="images" ... />` を削除。
  - `src/routes/RootLayoutRoute.tsx`:
    - `navLinks` から `/images`「画像」エントリを削除。
  - `src/routes/ComposerBox.tsx`:
    - 役割が「PostComposer の薄いラッパ + 画像添付」だけだったので、ファイルごと削除する代わりに、画像添付に関する `useImages` / `ImageUploader` / `attached` ステート / `MAX_ATTACHED_IMAGES` を全て撤去し、`PostComposer` を直接呼ぶ薄いラッパだけ残すか、もしくは呼び出し側で `PostComposer` を直接使うように差し替える。本タスクでは **`ComposerBox.tsx` を削除し、呼び出し側を `PostComposer` に直結** する方針。
  - `src/ui/components/PostComposer.tsx`:
    - 画像関連の props (`attachedImageIds` / `attachSlot` / `onDetachImage`) を削除し、見せていた画像チップ UI（`<ul className={styles.imageList}>...</ul>`）を撤去する。
    - `onSubmit` のシグネチャから `imageIds` を外す（`{ content; parentPostId? }` のみ）。
    - 画像なし版に簡素化。
  - `src/ui/components/PostComposer.module.css`:
    - 画像チップ用クラス (`.imageList` / `.imageItem` / `.detach`) を削除（残しても害はないが、未使用 CSS は削る）。
  - `src/routes/GlobalTimelineRoute.tsx` / `src/routes/HomeTimelineRoute.tsx` / `src/routes/PostDetailRoute.tsx`（投稿/返信フォームを描画している側）:
    - `ComposerBox` 利用箇所を `PostComposer` 直接呼び出しに置き換える。`onSubmit` で受け取る引数から `imageIds` を外し、`useTimelineController` / `usePostDetailController` の `onCreate` / `onReply` 側もシグネチャから `imageIds` を外す（後述）。
  - `src/hooks/useTimelineController.ts` / `src/hooks/usePostDetailController.ts`:
    - `onCreate` / `onReply` の入力型から `imageIds` を削除。
  - `src/hooks/usePostActions.ts`:
    - `actions.create(input)` の入力型 `CreatePostInput` から `imageIds` を削除（または実質無視）。
  - `src/services/inputMappers.ts`:
    - `fromCreatePostInput` で `image_ids: input.imageIds` を渡している箇所を削除。バックエンドが `image_ids` を必須としているなら `[]` を送る（後述）。
  - `src/types/vmInputs.ts`:
    - `CreatePostInput.imageIds?: string[]` を削除。
- 変更しない:
  - `src/services/mappers.ts` の `toPostVM` / `toImageVM`：受信側は維持。投稿に紐づく画像表示 (`PostCard.tsx` の `post.images.map(...)`) は触らない。バックエンドが古い投稿に画像 URL を返してくる可能性があるため。
  - `src/types/vm.ts` の `ImageVM` / `PostImageVM`：表示側で参照されるため残置。`ImageVM` は `useImages` を消すので参照箇所が減るが、`mappers.ts` の `toImageVM` から戻り値型として参照されるため型は残す。
- 削除/残置の判断（再掲）:
  - `toImageVM` / `Image` 型 / `ImageVM`: バックエンド型定義との対称性を保つため残す。lint で未使用警告が出る場合は `mappers.ts` 側だけ消すか eslint disable で注釈する。

破壊的変更:
- 既存ユーザの「画像添付」「画像ギャラリー」操作は不可能になる（仕様変更として周知）。
- 投稿作成リクエストに `image_ids` を含めなくなる。既存投稿の `images` 表示は維持。

## 実装ステップ

1. `src/routes/ComposerBox.tsx` の利用箇所を洗い出す（`HomeTimelineRoute` / `GlobalTimelineRoute` / `PostDetailRoute` のいずれか）。
   - `HomeTimelineRoute` と `PostDetailRoute` で `<ComposerBox />` を利用している。
2. `src/ui/components/PostComposer.tsx` を簡素化する。
   - props から `attachedImageIds` / `attachSlot` / `onDetachImage` を削除。
   - JSX から画像チップ表示部 (`<ul className={styles.imageList}>...</ul>`) と `attachSlot` の差し込みを削除。
   - `onSubmit` の引数型から `imageIds` を外す。
3. `src/routes/HomeTimelineRoute.tsx` / `src/routes/PostDetailRoute.tsx`（および将来的に `GlobalTimelineRoute` で投稿フォームが入る場合はそこも）で、`<ComposerBox onSubmit={...} />` を `<PostComposer onSubmit={...} />` に置換する。
   - `onSubmit` で受け取る引数を `{ content, parentPostId? }` に整える。
4. `src/hooks/useTimelineController.ts` / `src/hooks/usePostDetailController.ts` の `onCreate` / `onReply` の入力型から `imageIds` を削除。
5. `src/hooks/usePostActions.ts` の `create` の入力型から `imageIds` を削除。
6. `src/services/inputMappers.ts` の `fromCreatePostInput` を `{ content, parent_post_id }` のみに簡素化する。
   - バックエンド `CreatePostRequest` 型で `image_ids` が `required` なら `image_ids: []` を送る。`optional` なら省略する（`api/types.ts` を確認して決める）。
7. `src/types/vmInputs.ts` の `CreatePostInput.imageIds` を削除。
8. ルート/ナビ撤去:
   - `src/routes/router.tsx` から `ImagesRoute` の import と `<Route path="images" ... />` を削除。
   - `src/routes/RootLayoutRoute.tsx` の `navLinks` から「画像」エントリを削除。
9. ファイル削除:
   - `src/routes/ImagesRoute.tsx`
   - `src/routes/ComposerBox.tsx`
   - `src/ui/components/ImageUploader.tsx`
   - `src/ui/components/ImageGallery.tsx` / `ImageGallery.module.css`
   - `src/hooks/useImages.ts`
   - `src/api/endpoints/images.ts`
10. lint / 型チェックを通す:
    - `npm run lint` / `npm run build` で未使用 import やシグネチャ齟齬を検出して潰す。
11. 動作確認:
    - ヘッダから「画像」リンクが消えている。
    - 投稿フォームに「画像を添付」ボタンが無い。
    - 既存投稿に画像が紐づいている場合、`PostCard` 上で従来どおり画像が表示される。
    - 投稿作成が成功する。ネットワークタブで `/v1/images` 系のリクエストが一切飛ばない。

## テスト要件

- 手動テスト観点:
  - `/images` に直接アクセスすると 404 ページが出る（`NotFoundRoute`）。
  - ヘッダから「画像」リンクが消えている。
  - 投稿フォームに添付ボタンが無い。
  - 投稿作成（タイムライン / 返信）が成功する。
  - 既存の画像付き投稿が表示される（過去データに依存）。
  - ネットワークタブに `/v1/images` 系リクエストが出ていない。
- 自動テストはこのリポジトリでは追加しない（テスト基盤未導入）。

## 技術的な補足

- バックエンド `CreatePostRequest.image_ids` が `required` か `optional` かで `inputMappers.ts` の対応が変わる。`src/api/types.ts` を確認すること。`required` の場合は `image_ids: []` を送る。
- `ImageVM` / `toImageVM` を残すか削るかは判断が分かれる。本タスクでは **残す**（バックエンド型 `Image` がまだ存在するため対称性を維持）。lint の no-unused-exports が厳しい場合は併せて削除してよい。
- 「いったん削除」と言いつつコードを完全に消すのは、復元コストよりも残骸のメンテコストの方が高いと判断したため。再導入時は git 履歴 (`git log -- src/routes/ImagesRoute.tsx` など) からファイルを復元してから現行コードに合わせて整える方針。
- 投稿フォームから `ComposerBox` を消し `PostComposer` に直結したので、将来再び画像添付を入れる時は再び薄いラッパを設けるか、`PostComposer` 内で完結させるかを検討する。
- 関連ファイル（絶対パス）:
  - `/home/sheep/dev/fuju/frontend/src/routes/router.tsx`
  - `/home/sheep/dev/fuju/frontend/src/routes/RootLayoutRoute.tsx`
  - `/home/sheep/dev/fuju/frontend/src/routes/ImagesRoute.tsx`
  - `/home/sheep/dev/fuju/frontend/src/routes/ComposerBox.tsx`
  - `/home/sheep/dev/fuju/frontend/src/routes/HomeTimelineRoute.tsx`
  - `/home/sheep/dev/fuju/frontend/src/routes/PostDetailRoute.tsx`
  - `/home/sheep/dev/fuju/frontend/src/ui/components/PostComposer.tsx`
  - `/home/sheep/dev/fuju/frontend/src/ui/components/PostComposer.module.css`
  - `/home/sheep/dev/fuju/frontend/src/ui/components/ImageUploader.tsx`
  - `/home/sheep/dev/fuju/frontend/src/ui/components/ImageGallery.tsx`
  - `/home/sheep/dev/fuju/frontend/src/hooks/useImages.ts`
  - `/home/sheep/dev/fuju/frontend/src/hooks/useTimelineController.ts`
  - `/home/sheep/dev/fuju/frontend/src/hooks/usePostDetailController.ts`
  - `/home/sheep/dev/fuju/frontend/src/hooks/usePostActions.ts`
  - `/home/sheep/dev/fuju/frontend/src/services/inputMappers.ts`
  - `/home/sheep/dev/fuju/frontend/src/services/mappers.ts`
  - `/home/sheep/dev/fuju/frontend/src/types/vmInputs.ts`
  - `/home/sheep/dev/fuju/frontend/src/types/vm.ts`
  - `/home/sheep/dev/fuju/frontend/src/api/endpoints/images.ts`
  - `/home/sheep/dev/fuju/frontend/src/api/types.ts`
