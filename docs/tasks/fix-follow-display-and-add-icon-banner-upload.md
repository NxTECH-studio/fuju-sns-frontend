# フォロー表示の修正 と アイコン/バナー画像アップロード対応

## 概要

ユーザープロフィール画面の 2 件をまとめて対応する。

1. **修正**: フォロー済みのユーザーのプロフィールを開いてもフォロー済みとして表示されない問題を解消する（自分の following リストから target を探す方式に切り替え）。
2. **機能追加**: アイコン画像（AuthCore 経由）とバナー画像（SNS バックエンドの `/v1/images`）を画面からアップロードできるようにする。

両者ともプロフィール周りの UI / API 配線が中心で関連が高いため 1 ドキュメントにまとめる。実装順は (1) を先に通してから (2) に進む想定（修正の方が単純で、デプロイの分割もしやすい）。

> **フォロワー数の正常初期表示** は本タスクのスコープから外す（後述「決定事項メモ」参照）。本タスクはあくまで「フォロー済み判定」の修正と「アイコン/バナーアップロード UI」の追加。

> ⚠️ **責務分担の注意（重要）**
>
> アイコンとバナーは保存先・呼び出し API・型・キャッシュ挙動がすべて異なる別物。混同しないこと。
>
> | 種別 | 責務 | 呼び出し API | 反映経路 | 備考 |
> | --- | --- | --- | --- | --- |
> | **アイコン** | **AuthCore** (`/home/sheep/dev/fuju/auth/`) | `fuju-auth-react` の `useAuth().updateIcon(file)` → 内部で `PUT /v1/user/icon` (multipart, field名 `image`, JPEG/PNG/WebP のみ, 5MB 上限, `Authorization: Bearer` 必須) | `refreshMe()` で `/me` 再取得 → `MeVM.iconUrl` 更新 | SNS backend の `/v1/images` は使わない。レスポンスは `{id, icon_url}` で `icon_url` 自体は ULID 付きの一意 URL。**1h TTL キャッシュは SNS backend 側 (`IconURLCached`)** で持っており AuthCore 側はキャッシュヘッダを返さない。即時反映されないことがある旨は UI 注釈のみ。 |
> | **バナー** | **SNS backend** (`/home/sheep/dev/fuju/backend/`) | `POST /v1/images` (multipart, field名 `file`, `image/*`, 5MiB 上限) → `PUT /users/{sub}` で `banner_url` 保存 | プロフィール保存時に `banner_url` 反映 | AuthCore は経由しない。R2 無効環境では 404 になる点に注意。 |
>
> 実装時に「アイコンを `/v1/images` に投げる」「バナーを `updateIcon` に渡す」のような取り違えが起きると、エラーにはならず**間違ったフィールドが更新される**ことすらあるので特に注意。
>
> なお同じ multipart でも **field 名がアイコンは `image` / バナーは `file`、許可される MIME も AuthCore は JPEG/PNG/WebP のみ**（SNS backend は `image/*` 全般）と微妙に異なる。クライアント側プレチェックを入れる場合は両者を取り違えないこと。
>
> 参照:
> - AuthCore ハンドラ: `/home/sheep/dev/fuju/auth/interfaces/handler/v1/user.go`
> - AuthCore usecase / 制限値: `/home/sheep/dev/fuju/auth/usecase/user_uc/service.go`
> - AuthCore OpenAPI: `/home/sheep/dev/fuju/auth/docs/openapi.yaml`
> - SNS backend ハンドラ: `/home/sheep/dev/fuju/backend/internal/handler/image.go`

## 決定事項メモ（エンジニア回答 2026-05-10 反映）

| 項目 | 決定 | 補足 |
| --- | --- | --- |
| `useFollowState` の方式 | **自分の following リストから target を探す** | 自分のフォロー数の方が一般に少なく軽い。ページングは limit=50 で開始し、ヒットしなければ次ページへ。 |
| フォロワー数表示の backend 変更前提 | **必須前提にしない（別 feat）** | `PublicUser` への `followers_count` / `following_count` 追加は別 feat に切り出す。本タスクの Phase 1 ではフォロー済み判定のみ修正し、フォロワー数の初期表示は **従来どおり `null` 起点 → フォロー操作の楽観反映で更新** の挙動を維持する。VM 型への `followersCount` / `followingCount` 追加もこのタスクでは行わない。<br>※ 「no(feat) の解釈について本来は AskUserQuestion で再確認したい」が、Auto Mode により合理的な仮定で進行。誤りであれば差し戻し可。 |
| バナーの URL 直接入力欄 | **残す**（ファイル選択 UI と併存） | 既存利用ユーザー保護のため URL 入力欄は撤去しない。ファイル選択がメイン、URL 直接入力欄はその下に従来通り配置。<br>※ 「Yes」の解釈について本来は AskUserQuestion で再確認したい」が、Auto Mode により「残す」と解釈して進行。誤りであれば差し戻し可。 |
| アイコン 1h TTL（SNS backend 側キャッシュ） | **UI 注釈のみ**（強制 refresh は仕込まない） | AuthCore 自身はキャッシュしないが、SNS backend の `IconURLCached` が 1h TTL で保持しているため `/me` 再取得しても古い URL のまま返ることがある。アップロード成功 → `refreshMe()` で `/me` 再取得 → 即時反映されないことがある旨を Toast / inline 注釈で明示する。強制 refresh / cache bust 系の追加実装は行わない。 |

## 背景・目的

### 1. フォロー表示のバグ

- `GET /users/{sub}` の `PublicUser` レスポンスには `is_following` も `followers_count` も含まれていない（`backend/docs/swagger.yaml` の `PublicUser` schema、`backend/internal/handler/handler.go` の `publicUserView` で確認）。
- フロント側の現状実装 (`src/routes/UserProfileRoute.tsx`) はワークアラウンドとして以下のロジックを採っている:
  - フォロワー数: `useState<number | null>(null)` を初期値、つまり最初は常に `-` 表示。フォロー/アンフォロー操作を行ったときの API レスポンスでだけ更新される。**この挙動は本タスクでは修正しない**（決定事項メモ参照、別 feat に切り出し）。
  - フォロー済み判定: ユーザーのタイムライン (`useTimelineController("user", sub)`) の **1 件目の投稿** の `following_author` を見て推定 (`firstPost?.followingAuthor ?? false`)。
- このため、
  - 投稿 0 件のユーザーや、タイムライン取得が間に合っていないとき: `inferredFollowing = false` 固定となり、フォロー済みでも未フォロー扱いになる。
- 本タスクでは「フォロー済み判定」のみを正しく直す。手段は **viewer (= 自分) の `following` リストから target sub を線形探索する**。`GET /users/{me.sub}/following` を最大数ページ走査する。フォロワー数の初期表示は変更しない（既存どおり `null` で開始 → 操作時に楽観反映）。

### 2. アイコン / バナー画像アップロード

- 直近のコミット `7940695 feat(images): remove image upload feature from frontend` でフロントから画像アップロード経路は完全に削除済み (`docs/tasks/remove-image-upload.md` 参照)。バックエンド側の `/v1/images` API と `Image` 型は維持されているため、必要な箇所だけ通信を再生する。
- 現在のプロフィール編集 (`src/routes/settings/SettingsProfileSection.tsx`) は **バナー画像 URL を手入力するテキスト欄** のみ。実運用ではユーザーが URL を持ってくる手段が無く、事実上機能していない。
- アイコンは AuthCore 側 (`/home/sheep/dev/fuju/auth/`) で管理されており、`fuju-auth-react` の `useAuth().updateIcon(file: File)` が公式 API として用意されている (`node_modules/fuju-auth-react/README.md` 374 行目)。内部的には `PUT /v1/user/icon` (multipart/form-data, フィールド名 `image`, JPEG/PNG/WebP のみ, 5MB 上限, `Authorization: Bearer` 必須) を叩く。SNS 側の `IconURLCached` は SNS backend が AuthCore から取得した結果を 1h TTL でキャッシュしている**コンシューマ側のキャッシュ**であり、AuthCore 自身はキャッシュヘッダを返さない（アップロード時は ULID 付きの新 URL が返るため AuthCore 側ではキャッシュバスティング可能）。フロントからの呼び出し自体は AuthCore に向けて行い、その後 `/me` を refresh して反映する。**SNS backend 側の 1h TTL の影響で `/me` 経由の icon URL が即時反映されないケースがある旨は UI で注釈表示するのみ。強制 refresh は実装しない**。
- バナーは SNS バックエンドの `POST /v1/images` (multipart/form-data, `file` フィールド, `image/*`, max 5MiB) でアップロードして、返ってきた `public_url` を `PUT /users/{sub}` の `banner_url` に保存する 2 段構成。

## 影響範囲

### バグ修正 (1) で触る場所

- `src/routes/UserProfileRoute.tsx`
- `src/api/endpoints/follows.ts`（既存の `listFollowing` を利用、必要なら export 追加のみ）
- `src/hooks/useFollowState.ts`（新規）

> 本タスクでは VM 型 (`UserVM`) に `followersCount` / `followingCount` を追加しない。`src/api/types.ts` / `src/services/mappers.ts` / `src/types/vm.ts` のフォロー数関連の型変更は別 feat へ。

### 機能追加 (2) で触る場所

- 新規:
  - `src/api/endpoints/images.ts`（再生。multipart upload。最低限 `uploadImage(file)` だけ）
  - `src/hooks/useImageUpload.ts`（FormData を組み立てて `/v1/images` を叩くフック）
  - `src/ui/components/ImageFileInput.tsx`（共通の画像選択 + プレビュー UI。任意で導入。inline でも可）
- 変更:
  - `src/routes/settings/SettingsProfileSection.tsx`: アイコンアップロード UI（`updateIcon(file)` 呼び出し）と、バナー用ファイル選択 UI を追加。**バナー URL 手入力欄は残置**（併存）。
  - `src/api/types.ts` / `src/services/mappers.ts` / `src/services/vm.ts` / `src/types/vm.ts`: `Image` まわりの型と VM が残っている前提で再利用。`toImageVM` を mappers に再エクスポート（必要なら）。
  - `src/services/inputMappers.ts`: `fromUpdateProfileInput` は変更不要（`bannerUrl` をそのまま `banner_url` に流す既存実装でよい）。
  - `src/api/client.ts`: `postForm` が既にあるので追加変更なし。

### 破壊的変更

- なし。
  - バナー URL 手入力欄は残置するため後方互換あり。
  - フォロー判定ロジックの差し替えに伴い `useTimelineController` の戻り値や挙動には触らない（別概念に分離）。

## 実装ステップ

### Phase 1: フォロー済み判定の修正

1. **`useFollowState` を新設する**
   - `src/hooks/useFollowState.ts` を新規作成。
   - シグネチャ: `useFollowState(targetSub: string | undefined): { following: boolean | null; loading: boolean; setFollowing: (next: boolean) => void }`。
     - `null` は判定中。確定後 `true` / `false`。
     - `setFollowing` は `useFollowToggle` の楽観反映から書き戻すための setter。
   - 早期リターン:
     - 未認証 (`me?.sub` が無い) → `following = false`, `loading = false`。
     - 自分自身を見ている (`targetSub === me.sub`) → `following = false`, `loading = false`。
   - データ取得:
     - `GET /users/{me.sub}/following?limit=50` をページングしながら `data[].user.sub === targetSub` を探す。
     - 1 ページ目でヒットしなければ `next_cursor` がある限り次ページへ。**最大ページ数の上限はとりあえず無制限**（自分のフォロー数なので現実的には数ページで終わる想定）。負荷が問題化したら別 PR で `limit` 引き上げ or キャッシュを検討。
     - `signal` でキャンセル可能にする（`useEffect` クリーンアップで abort）。
   - エラー時: `following = false` に倒し、`console.error` のみ。Toast は出さない（プロフィール表示の阻害を避ける）。
2. **`UserProfileRoute.tsx` を改修**
   - `firstPost?.followingAuthor` 経由の推定を削除し、`useFollowState(sub)` の結果を `<FollowControl>` の `initialFollowing` に渡す。
   - `key={followKey}` の再マウント方式は維持（hook の戻り値が `null` (pending) → 確定 に切り替わったタイミングで再シードしたいので、`followKey` に `following === null ? "pending" : String(following)` のような表現を入れる）。
   - `timelineReady` でフォローボタン表示を縛っている既存ガードがあれば撤去する（タイムライン取得とフォロー判定を分離）。
   - **`followersCount` の初期値は変更しない**: `useState<number | null>(null)` のまま。フォロー / アンフォロー時の楽観反映で更新する既存挙動を維持。**初期表示が `-` のままになる問題は本タスクでは扱わない**（別 feat）。
3. **`useFollowToggle` 周辺の整合**
   - `useFollowToggle` 内で楽観反映後に `setFollowing` を呼ぶ既存設計はそのまま流用。`useFollowState` から出した `setFollowing` を `<FollowControl>` 経由で連結できるかを確認する。難しければ、`useFollowState` 内に `useFollowToggle` を組み込む方式（hook 統合）も選択肢。
4. **動作確認**
   - フォロー済みユーザー（投稿 0 件含む）のプロフィールを開いて「フォロー中」になっていること。
   - 自分自身のプロフィールでフォローボタンが出ないこと。
   - フォロー / アンフォローでボタン状態が即時反映されること。
   - フォロワー数表示は **本タスクでは引き続き `-` から始まる**（楽観反映時のみ数値更新）。これは仕様として後続 feat で扱う。

### Phase 2: アイコン / バナー画像アップロード

5. **画像アップロード API クライアントを再生**
   - `src/api/endpoints/images.ts` を新規作成。
     - `uploadImage(client, file: File, signal?: AbortSignal): Promise<ImageEnvelope>` を実装。`FormData` に `file` キーで `File` を append し、`client.postForm("/v1/images", form)` を呼ぶ。
   - `Image` / `ImageEnvelope` は `src/api/types.ts` にすでに残っているので追加不要（事前確認済み）。
6. **アップロード用フックを追加**
   - `src/hooks/useImageUpload.ts` を新規作成。
     - 状態: `{ uploading: boolean; error: string | null; upload: (file: File) => Promise<{ id: string; publicUrl: string }> }`
     - 失敗時は throw して呼び出し側で toast 表示。バックエンドのエラーメッセージは `FujuApiError.message` をそのまま流用。
     - サイズ・MIME のクライアント側プレチェック（5MiB / `image/*`）。バックエンドでも検証されるが UX のため。
7. **アイコンアップロード UI を SettingsProfileSection に追加**
   - 既存の `<p>...アイコンも同様です。</p>` の文言を撤去し、`<input type="file" accept="image/*" />` ベースの UI を追加。
   - `useAuth().updateIcon(file)` を呼ぶ。成功後 `refreshMe()` で `MeVM` の `iconUrl` を refresh。
   - **1h TTL 注釈**: アップロードボタン下 or Toast に「反映まで最大 1 時間ほどかかる場合があります（AuthCore キャッシュの都合）」を表示。強制 refresh / cache bust は実装しない。
   - 失敗時は `useToast().show` でエラー表示。
8. **バナーアップロード UI を SettingsProfileSection に追加**
   - 既存の `バナー画像 URL` テキスト入力欄の **直前** にファイル選択ボタンを追加。**URL 入力欄は残す**（決定事項メモ参照）。
   - 選択したファイルを `useImageUpload().upload(file)` でアップロード → 戻り値の `publicUrl` を `setBannerUrl` で同セクションのテキスト入力欄に流し込む（プレビュー兼編集可能性のため）。
   - 既存の `handleProfileSubmit` 経由 (`useProfileEdit().submit`) で `banner_url` を保存する流れはそのまま。これによりアップロードと保存を 2 アクションに分離する（誤操作で URL を確定させない）。
   - URL 直接編集も併存（先頭に「ファイル選択」、その下に従来の URL 入力欄）。**URL 入力欄を畳みボタン化するなどの UX 改善は別タスク**。
9. **lint / build を通す**
   - `npm run lint` / `npm run build`。

### Phase 3: 動作確認

10. プロフィール画面の手動チェック:
    - 自分以外のフォロー済みユーザー（投稿 0 件含む）のページで「フォロー中」表示。
    - フォロー / アンフォローでボタン状態が即時反映。
    - フォロワー数の初期表示が `-` であること（本タスクでは想定挙動。別 feat で改善予定）。
11. 設定画面の手動チェック:
    - アイコン画像をアップロードできる。`/me` 再取得後に新しい画像 URL に切り替わる（タイミング差は注釈で説明）。
    - 1h TTL の注釈が UI に表示されている。
    - バナー画像をアップロードできる。アップロード後にテキスト欄に URL が流し込まれ、「保存」を押すと `bannerUrl` が `PublicUser.banner_url` に書き込まれ、プロフィール画面で反映される。
    - URL 手入力欄が残っていて、従来通り URL を直接書いても保存できる。
    - 5MB 超 / 非画像ファイルを選んだときにバックエンドからのエラーが toast で表示される。
    - ネットワークタブで `/v1/images` リクエストが成功（201）し、`PUT /users/{sub}` で `banner_url` が更新されている。

## テスト要件

- 自動テストはこのリポジトリでは追加しない（`docs/tasks/remove-image-upload.md` でも触れている通りテスト基盤未導入）。
- 手動テスト観点は上記 Phase 3 のチェック項目で代替。

## 技術的な補足

- **バックエンドの仕様（参考、絶対パス）**:
  - 画像アップロード: `/home/sheep/dev/fuju/backend/internal/handler/image.go` の `UploadImage` (`POST /v1/images`, multipart, `file` フィールド, max 5MiB, `image/*` のみ; `Content-Type` と sniff 双方をチェック)。
  - 画像レスポンス型: `/home/sheep/dev/fuju/backend/internal/handler/image.go` の `publicImageView` (`id`, `file_name`, `mime_type`, `file_size`, `public_url`, `user_id`, `created_at`, `updated_at`, `deleted_at?`)。フロント `src/api/types.ts` の `Image` と一致済み。
  - 画像削除: `DELETE /v1/images/{id}` (本タスクでは UI は出さないが、必要なら `deleteImage` も再生してよい)。
  - R2 が無効な環境ではルート自体が登録されず 404 になる (`backend/cmd/server/main.go` 257〜261)。ローカル開発で R2 を有効化していない場合はバナーアップロード UI が動かない。エラー時の UX を Toast で出すこと。
  - フォロー API: `POST/DELETE /users/{sub}/follow`、`GET /users/{sub}/followers|following` はそのまま使用。
- **AuthCore 経由のアイコン更新**:
  - `fuju-auth-react` の `useAuth().updateIcon(file)` を使う。SNS バックエンドの `/v1/images` は使わない。
  - 内部実装は `PUT /v1/user/icon` (multipart, フィールド名 `image`, JPEG/PNG/WebP のみ, 5MB 上限)。クライアント側プレチェックを入れる場合は MIME と field 名がバナー側 (`/v1/images`, field名 `file`, `image/*`) と異なる点に注意。
  - 成功後に `useMeContext().refresh()` を呼んで `/me` を再取得する。`SelfUser.icon_url` は **SNS backend の `IconURLCached` (1h TTL コンシューマ側キャッシュ)** を経由して返るため、AuthCore 側で URL が更新されても即時反映されないことがある旨を **UI 注釈** で明示する（決定事項メモ参照）。
  - AuthCore 関連の参照: `/home/sheep/dev/fuju/auth/interfaces/handler/v1/user.go` / `usecase/user_uc/service.go` / `docs/openapi.yaml`。
- **フォロワー数の初期表示について**:
  - 本タスクでは扱わない（別 feat）。backend 側の対応案 (`PublicUser` に `followers_count` / `following_count` 追加、`publicUserView` 4 行 + JSON タグ + swagger 更新) は別 feat ドキュメントで起票してから実装する。
- **既存ワークアラウンドの撤去**:
  - `useTimelineController("user", sub)` を `firstPost.followingAuthor` 推定のためだけに駆動している依存は消す。`UserProfileRoute` の投稿一覧表示自体は引き続き `useTimelineController` を使う（タイムライン目的では正当）。
- **コードのスタイル / 既存パターンに合わせる**:
  - VM 層と API 層の境界 (`src/types/vm.ts` ⇔ `src/api/types.ts`) を維持。UI から `api/types.ts` を直接 import しない。
  - 楽観 UI 反映は `useFollowToggle` 既存実装に倣う。

### 関連ファイル（絶対パス）

- フロント側
  - `/home/sheep/dev/fuju/frontend/src/routes/UserProfileRoute.tsx`
  - `/home/sheep/dev/fuju/frontend/src/routes/FollowControl.tsx`
  - `/home/sheep/dev/fuju/frontend/src/routes/settings/SettingsProfileSection.tsx`
  - `/home/sheep/dev/fuju/frontend/src/ui/components/UserProfileView.tsx`
  - `/home/sheep/dev/fuju/frontend/src/ui/components/FollowButton.tsx`
  - `/home/sheep/dev/fuju/frontend/src/hooks/useFollowToggle.ts`
  - `/home/sheep/dev/fuju/frontend/src/hooks/useUserProfile.ts`
  - `/home/sheep/dev/fuju/frontend/src/hooks/useProfileEdit.ts`
  - `/home/sheep/dev/fuju/frontend/src/api/endpoints/users.ts`
  - `/home/sheep/dev/fuju/frontend/src/api/endpoints/follows.ts`
  - `/home/sheep/dev/fuju/frontend/src/api/client.ts`
  - `/home/sheep/dev/fuju/frontend/src/api/types.ts`
  - `/home/sheep/dev/fuju/frontend/src/services/mappers.ts`
  - `/home/sheep/dev/fuju/frontend/src/services/inputMappers.ts`
  - `/home/sheep/dev/fuju/frontend/src/types/vm.ts`
  - `/home/sheep/dev/fuju/frontend/src/types/vmInputs.ts`
  - 新規予定:
    - `/home/sheep/dev/fuju/frontend/src/api/endpoints/images.ts`
    - `/home/sheep/dev/fuju/frontend/src/hooks/useImageUpload.ts`
    - `/home/sheep/dev/fuju/frontend/src/hooks/useFollowState.ts`
- バックエンド参照（読むだけ）
  - `/home/sheep/dev/fuju/backend/internal/handler/image.go`
  - `/home/sheep/dev/fuju/backend/internal/handler/handler.go`
  - `/home/sheep/dev/fuju/backend/internal/handler/follow.go`
  - `/home/sheep/dev/fuju/backend/internal/usecase/follow/usecase.go`
  - `/home/sheep/dev/fuju/backend/internal/domain/user.go`
  - `/home/sheep/dev/fuju/backend/internal/domain/image.go`
  - `/home/sheep/dev/fuju/backend/docs/swagger.yaml`
- 過去タスク（参照）
  - `/home/sheep/dev/fuju/frontend/docs/tasks/remove-image-upload.md`（撤去当時の意思決定）
