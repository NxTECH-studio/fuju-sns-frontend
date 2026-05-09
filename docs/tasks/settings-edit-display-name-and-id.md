# 設定ページから display_id を編集できるようにする

## 概要

`/settings/profile` の編集フォームに `display_id` (AuthCore の `public_id`) の編集 UI
を追加する。`fuju-auth-react` が公開している `useAuth().updatePublicID()` を使い、
AuthCore の `PATCH /v1/user/public_id` を叩く。

`display_name` は **当面スコープ外** とする。アーキテクチャ調査の結果、display_name
は AuthCore にも SNS backend にも書き込み可能なフィールド／エンドポイントが存在せ
ず、現状は AuthCore の `public_id` から派生する読み取り専用の値であることが判明し
た。display_name を独立に変更可能にするには別リポジトリ (auth または backend) で
カラム追加 + エンドポイント追加が必要。本タスクは frontend で完結する範囲のみを扱
う。

## 背景・目的

- 直近の PR (#12) で `/settings/profile` に bio / bannerUrl 編集を移植した際、画面
  注記として「display_name / display_id / アイコンは AuthCore 側で編集してくださ
  い。」を残した (`src/routes/settings/SettingsProfileSection.tsx`)。
- 別タブで AuthCore の UI を開かせる導線になっており不便。少なくとも `display_id`
  はフロントの設定画面で完結させたい。
- ユーザの当初要望は「display_name / display_id 両方」。調査の結果 display_name は
  別リポジトリ対応待ちのため、まず display_id を片付ける。

## 現状把握 (調査結果)

### `display_id` (= `public_id`) の更新経路

- AuthCore に書き込みエンドポイントが既にある: `PATCH /v1/user/public_id`
  (`auth/interfaces/handler/v1/user.go:55-78`)。
- `fuju-auth-react` が `useAuth().updatePublicID(next)` として薄くラップしている。
  内部で `Authorization: Bearer ${authToken}` + `credentials: "include"` を付けて
  呼び出す (`node_modules/fuju-auth-react/dist/index.js`)。
- フロント側のクライアント検証用に `validatePublicId(value): ErrorCode | null` も
  公開 (`node_modules/fuju-auth-react/dist/index.d.ts`)。
- エラーコード (`auth/interfaces/handler/v1/user.go`、要約):
  | 条件             | ステータス | コード                     |
  | ---------------- | ---------- | -------------------------- |
  | 予約語           | 400        | `PUBLIC_ID_RESERVED`       |
  | フォーマット不正 | 400        | `PUBLIC_ID_FORMAT_INVALID` |
  | 既に使用中       | 409        | `PUBLIC_ID_ALREADY_EXISTS` |

### `display_name` を本タスクで扱わない理由

- AuthCore には `display_name` のカラムも書き込みエンドポイントも存在しない
  (`auth/docs/openapi.yaml` の `/v1/user/...` 配下に `display_name` 関連の write
  パス無し)。
- `fuju-auth-react` 側の `displayName` は `raw.display_name ?? raw.public_id` の
  フォールバックで、実体は AuthCore の `public_id` を返している。
- SNS backend の `users.display_name_cached` は AuthCore mirror で 1h TTL の **読み
  取り専用キャッシュ** (`backend/db/migrations/001_initial_schema.sql:12`、
  `backend/internal/domain/user.go:14`)。`UpdateUserProfileRequest` は `bio` /
  `banner_url` のみ受け付け、display_name は意図的に除外
  (`backend/docs/swagger.yaml` 137-140 行)。
- つまり「display_id を変える」≒「ユーザに見える表示名を変える」に近く、display_id
  だけ実装すれば実用的にユーザの要望はほぼ満たせる。display_name を独立に変更可能
  にするには:
  - AuthCore にカラム + `PATCH /v1/user/display_name` を追加する、もしくは
  - SNS backend に `display_name` 書き込み権を移譲する (アーキテクチャ変更)
  どちらも本タスクのスコープを大きく超える。

### Fuju バックエンド側の制約

- `PUT /users/{sub}` (`backend/internal/handler/handler.go:173`) は AuthCore 所有
  フィールド (`display_name` / `display_id` / `icon_url`) の更新を受け付けない。
- よって display_id 更新は AuthCore に対して `useAuth().updatePublicID()` で行い、
  Fuju 側のキャッシュ (`display_id_cached`) は次回 hydrate (最大 1h ラグ) で同期さ
  れる。

## 採用方針

- **`display_id`**: `useAuth().updatePublicID(next)` を直接呼ぶ。`<AuthGuard>` 配下
  でのみ取得可能だが、`/settings/profile` は認証必須で `useMeReady()` 早期 return
  済みなので問題なし。
- **更新後の反映**:
  1. `useAuth().refreshProfile()` で `useAuth().user.publicId` を即時更新 (ヘッダ
     表示は `useAuthStatus().user` 経由なので即反映)。
  2. `useMeContext().refresh()` で `MeVM.displayId` を再取得 (Fuju 側キャッシュは
     最大 1h ラグの可能性を仕様として許容)。
- **クライアント検証**: `validatePublicId(draft)` (fuju-auth-react export) で送信
  前バリデーション。`null` 戻りなら OK、`ErrorCode` 戻りならフォーム上にエラー表
  示 (`<TextInput error={...}>`)。
- **楽観更新はしない**: ロールバック処理を増やすほどの UX 価値がないため、サーバ
  確認後反映でよい。送信中はボタンを `disabled`。
- **エラー contract** (toast + `<TextInput error>`):
  - `PUBLIC_ID_ALREADY_EXISTS` → "この ID は既に使われています"
  - `PUBLIC_ID_RESERVED` → "予約された ID です。別の ID を選んでください。"
  - `PUBLIC_ID_FORMAT_INVALID` → "英数字のみで入力してください"
  - `RATE_LIMIT_EXCEEDED` → "しばらく待ってから再度お試しください"
  - 上記以外 / network → fallthrough で `err.message` または "更新に失敗しました"
- **display_name の扱い**: フォームは追加しない。注記文言を「**表示名 (display
  name) はログイン元のアカウント設定で編集してください。アイコンも同様です。**」
  に書き換え、変更可否の現状を正しく伝える。

## 影響範囲

### 変更するファイル

- `src/routes/settings/SettingsProfileSection.tsx`
  - 既存の bio / bannerUrl フォームの上に `display_id` (公開 ID) 編集セクションを
    追加する (合計 2 セクション)。
  - 注記を `display_name` / アイコンの導線に修正。
- `src/routes/Settings.module.css`
  - セクション間の余白用スタイルを必要に応じて追加 (`.section`,
    `.sectionTitle`)。

### 新規作成するファイル

- なし。`useAuth().updatePublicID()` を直接呼べば足りるので独自フックは不要。
  ただしエラーマッピングと `refreshProfile` + `meContext.refresh` のシーケンスが
  共通化したくなる場合のみ `src/hooks/useDisplayIdUpdate.ts` を切り出す (任意)。

### 変更しないもの (意図的)

- `src/api/types.ts` の `UpdateUserProfileRequest` には触れない。Fuju バックエンド
  が受け付けないため。
- `src/types/vmInputs.ts` の `UpdateProfileInput` にも `display_*` を足さない。
- `src/services/inputMappers.ts` の `fromUpdateProfileInput` にも追加しない。
- `src/api/endpoints/users.ts` には AuthCore 直叩きを混入させない (Fuju バックエ
  ンド向け)。

### 破壊的変更

なし。既存の bio / bannerUrl フォームの動作は維持。

## 実装ステップ

1. **`SettingsProfileSection.tsx` を 2 セクション構成に再編**
   - 最上位 `<h1>プロフィール編集</h1>` は維持。
   - **セクション 1**: `<h2>公開 ID</h2>` + フォーム
     - `TextInput` ラベル「公開 ID (display_id)」。初期値は `me.displayId`。
       `pattern="[A-Za-z0-9]+"` (HTML レベル防御、サーバ側で再検証される前提)。
     - 送信ハンドラ:
       1. `validatePublicId(draft)` (fuju-auth-react import) でクライアント検証。
          `null` 以外なら `<TextInput error={...}>` に表示して送信中止。
       2. `setBusy(true)` → `await updatePublicID(draft)` → `await
          refreshProfile()` → `await meRefresh()` → `setBusy(false)`。
       3. 成功時 `toast.show("公開 ID を更新しました", "success")`。
       4. 失敗時 `isAuthError(err)` で narrow し、`code` を上記マップで日本語化し
          てトースト表示。
   - **セクション 2**: 既存の bio / bannerUrl フォーム (現行のまま動作維持)。
   - 各セクション間は `.section` margin で視覚分離。各フォームは独立してサブミッ
     ト可能。

2. **注記の修正**
   - 旧: 「display_name / display_id / アイコンは AuthCore 側で編集してくださ
     い。」
   - 新: 「表示名 (display name) はログイン元のアカウント設定で編集してくださ
     い。アイコンも同様です。」
   - もしくは `display_id` セクションの説明文として「display_id を変更すると
     表示名にも反映されます。表示名のみの変更は現状未対応です。」を入れる。

3. **トースト共通化**
   - エラーコード → 日本語メッセージのマップは `src/routes/settings/` 内の
     ローカル helper として切り出す (`messageForPublicIdError(code: string):
     string`)。再利用箇所は当面なくても、`SettingsProfileSection` が太るのを抑え
     る目的。

4. **navigation の見直し (任意)**
   - 現行 bio フォーム成功時 `navigate('/users/${me.sub}')`。display_id フォーム
     成功時はトースト表示のみで遷移しないのが自然。bio フォームの遷移挙動は本タス
     クのスコープ外で維持する。気になれば別タスクで揃える。

5. **CSS 微調整**
   - `Settings.module.css` に `.section { margin-bottom: 24px; }` /
     `.sectionTitle { font-size: 16px; ... }` を追加 (必要に応じて)。

## テスト要件

- 手動テスト (display_id):
  - 4 文字未満 / 17 文字以上 / 記号含む → `validatePublicId` でブロック、
    `<TextInput error>` 表示 (送信されない)。
  - 予約語 (例: `me`、`admin` 等) → サーバ 400 `PUBLIC_ID_RESERVED` →
    日本語トースト。
  - 既に使われている ID → サーバ 409 `PUBLIC_ID_ALREADY_EXISTS` → 日本語
    トースト。
  - 正常系: 更新成功 → トースト → ヘッダーのユーザー名表示
    (`RootLayoutRoute.tsx` で `useAuthStatus().user.displayName` 経由) が即時更
    新。`/users/:sub` ページの `displayId` 表示は最大 1h ラグ (Fuju キャッシュ
    TTL)。
  - 認可: ログアウト状態で `/settings/profile` に直アクセス → 既存の
    `useMeReady()` ガードでログイン誘導画面 (動作変化なし)。
- ユニットテスト:
  - 既存テストは `useProfileEdit` / `SettingsProfileSection` ともに無いため新規
    導入は必須ではない。

## 不確実性 / 前提条件

1. **`useAuth().updatePublicID` が `refreshProfile` を内部で呼ぶか**
   - `fuju-auth-react` の挙動を要確認。呼んでくれているなら明示的な
     `refreshProfile()` は不要 (二重呼び出しになる)。実装時にネットワークタブで
     1 回 / 2 回どちらかを確認し、不要な呼び出しは削る。
2. **バリデーションルールの最終仕様**
   - `validatePublicId` の戻りコード (`PUBLIC_ID_FORMAT_INVALID` /
     `PUBLIC_ID_RESERVED` 等) と HTML `pattern` の対応。実装時に
     `node_modules/fuju-auth-react/dist/index.js` の `validatePublicId` 実装を見
     て揃える。
3. **AuthCore 側のレート制限**
   - `RATE_LIMIT_EXCEEDED` のしきい値は AuthCore 側設定に依存。テスト時に意図せず
     ヒットしないか軽く確認。
4. **display_name 編集の将来対応**
   - 本タスクではスコープ外。AuthCore に `display_name` カラム + 書き込みエンド
     ポイントを追加した時点で別タスクとして扱う。その際は本タスクで作った 2 セク
     ション構成の上に「表示名」セクションを 1 つ足す形でほぼ拡張のみで済む想定。

## 技術的な補足

- **AuthCore キャッシュ TTL**: backend 側の `display_id_cached` /
  `display_name_cached` は 1h TTL (`backend/docs/authcore-integration.md`)。
  AuthCore 側の更新が即時反映するのは `useAuth().user` (in-memory) のみで、
  `MeVM.displayId/displayName` は最大 1h ラグ。
- **`useAuth` の取り回し**: `useAuth()` は `<AuthGuard>` 配下でしか呼べない。
  `SettingsRoute` で `useMe()` のステータス分岐 + `<AuthGuard required>` 配下と
  認識しているが、念のため実装時に親ルートで `<AuthGuard>` が有効か確認すること。
- **`validatePublicId` import**: `import { validatePublicId, isAuthError,
  ErrorCodes } from "fuju-auth-react"` で取れる。
- **既存 `useProfileEdit`**: bio / bannerUrl 用。display_id 経路は
  `useAuth().updatePublicID()` を直接使うので `useProfileEdit` は touch しない。

## 関連ファイル (絶対パス)

- `/home/sheep/dev/fuju/frontend/src/routes/settings/SettingsProfileSection.tsx`
- `/home/sheep/dev/fuju/frontend/src/routes/Settings.module.css`
- `/home/sheep/dev/fuju/frontend/src/hooks/useProfileEdit.ts`
- `/home/sheep/dev/fuju/frontend/src/state/MeProvider.tsx`
- `/home/sheep/dev/fuju/frontend/src/state/meContext.ts`
- `/home/sheep/dev/fuju/frontend/src/types/vm.ts`
- `/home/sheep/dev/fuju/frontend/node_modules/fuju-auth-react/dist/index.d.ts`
  (参考: `useAuth` の型 — `updatePublicID`, `validatePublicId`, `isAuthError`,
  `ErrorCodes`)
- `/home/sheep/dev/fuju/frontend/node_modules/fuju-auth-react/dist/index.js`
  (参考: `updatePublicId` のパス・ボディ、`parseError` shape)
- `/home/sheep/dev/fuju/auth/interfaces/handler/v1/user.go`
  (参考: AuthCore の `PATCH /v1/user/public_id` 実装、エラーコード)
- `/home/sheep/dev/fuju/auth/docs/openapi.yaml`
  (参考: `/v1/user/...` 配下のエンドポイント一覧)
- `/home/sheep/dev/fuju/backend/internal/domain/user.go`
  (参考: `display_name_cached` / `display_id_cached` の責務)
- `/home/sheep/dev/fuju/backend/db/migrations/001_initial_schema.sql`
  (参考: cached カラムの定義)
- `/home/sheep/dev/fuju/backend/docs/authcore-integration.md`
  (参考: mirror TTL 1h)
- `/home/sheep/dev/fuju/backend/docs/swagger.yaml`
  (参考: Fuju `PUT /users/{sub}` の制約)
