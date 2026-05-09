# ユーザー設定ページの追加

## 概要

ユーザーがアプリ側で変更可能な諸設定を集約する「設定」ページを `/settings` として新設する。
最初のセクションとして、現状 `/me/edit` にある bio / バナー画像 URL の編集機能をプロフィールタブとして取り込み、将来の設定項目（通知・表示・アカウントなど）を追加しやすい構造にしておく。

## 背景・目的

- 現状、ユーザーが変更できる項目は `/me/edit`（`MyProfileEditRoute`）の bio / banner_url の 2 項目のみで、ヘッダに「プロフィール編集」というリンクで露出している。
- 今後「通知設定」「タイムライン表示設定」などアプリ固有の設定を増やしていく際、既存ルートに継ぎ足すと UI が散らかり、AuthCore 側で編集する項目（display_name / display_id / アイコン）との責任分界が曖昧になる。
- 「設定ハブ」を 1 箇所に集約することで、追加導線をいちいちヘッダに増やさずに済むようにし、AuthCore で編集する項目とアプリ側で編集する項目の境界を UI 上でも明確化する。
- 既存リンク (`/me/edit`) を踏んでいる箇所がある (`UserProfileRoute.tsx:54`) ので、リンク切れを起こさないよう旧 URL からのリダイレクトを用意する。

## 影響範囲

- 新規:
  - `src/routes/SettingsRoute.tsx`: 設定ページのレイアウト（タブ/サイドメニュー + 内容領域）。最初は「プロフィール」セクションのみ。
  - `src/routes/settings/SettingsProfileSection.tsx`: 既存 `MyProfileEditRoute` の本体ロジック（bio/banner 編集フォーム）を移植したコンポーネント。
  - 任意: `src/ui/components/SettingsNav.tsx`: タブ/サイドメニューの UI プリミティブ。1 セクションだけでも将来の拡張を見越して置いておくと差分が小さくなる。
- 変更:
  - `src/routes/router.tsx`:
    - `/settings` ルートを追加し `SettingsRoute` をマウント。
    - `/me/edit` を `<Navigate to="/settings/profile" replace />` に置換（後方互換のため即削除はしない）。
    - 子ルート構成にするか、クエリ/タブで切り替えるかは内部実装の判断（最初は 1 セクションなので index ルート + 将来 `/settings/profile` 等を子ルートに割り当てる前提で骨組みだけ用意する）。
  - `src/routes/RootLayoutRoute.tsx`:
    - `navLinks` の「プロフィール編集」(`/me/edit`) を「設定」(`/settings`) に変更。`active` 判定を `location.pathname.startsWith("/settings")` に。
  - `src/routes/UserProfileRoute.tsx`:
    - 「プロフィール編集」ボタンの遷移先を `/settings/profile`（または `/settings`）に変更。
- 削除（移植後）:
  - `src/routes/MyProfileEditRoute.tsx`: 内容を `SettingsProfileSection` に移したら本ファイルは削除。`router.tsx` 側の import も消す。

破壊的変更は無いが、URL は `/me/edit` → `/settings/profile` に変わる。リダイレクトでカバーする。

## 実装ステップ

1. `src/routes/SettingsRoute.tsx` を新設。
   - 認証ガード: 未ログインなら `EmptyState` で「ログインが必要です」+ ログインボタン（既存ルートと同じパターン）。
   - レイアウト: 左にナビ（最初は「プロフィール」のみ）、右にコンテンツ。最初は `<Outlet />` ベースで、index 子ルート (`/settings` → profile) を `<SettingsProfileSection />` にする。
2. `src/routes/settings/SettingsProfileSection.tsx` を新設し、`MyProfileEditRoute.tsx` の本体（`useMe`, `useProfileEdit`, `useToast`, フォーム JSX）をそのまま移植する。
   - 「保存」後の遷移先は `/users/${me.sub}` のままで良い。または同画面に留まり Toast のみ出す形でも良い。最小差分のため遷移は維持する。
3. `src/routes/router.tsx` を更新。
   - `MyProfileEditRoute` の import を削除し、`SettingsRoute` / `SettingsProfileSection` を import。
   - `<Route path="settings" element={<SettingsRoute />}>` を追加し、`index` で `<SettingsProfileSection />`、`path="profile"` でも `<SettingsProfileSection />` を割り当てる（将来 `notifications` 等を兄弟として追加できる骨組み）。
   - `<Route path="me/edit" element={<Navigate to="/settings/profile" replace />} />` を追加（react-router の `Navigate` を使う）。
4. `src/routes/RootLayoutRoute.tsx` の `navLinks` を更新。
   - 「プロフィール編集」を「設定」に変更。`to: "/settings"`、`active: location.pathname.startsWith("/settings")`。
5. `src/routes/UserProfileRoute.tsx:54` の `navigate("/me/edit")` を `navigate("/settings/profile")` に置換。
6. `MyProfileEditRoute.tsx` を削除し、未使用 import を整理する。
7. 動作確認:
   - ヘッダの「設定」からプロフィール編集へ到達できる。
   - bio / banner_url の保存が従来どおり動く。
   - 旧 URL `/me/edit` をブラウザに直接打っても `/settings/profile` にリダイレクトされる。
   - 自分のプロフィール画面の「プロフィール編集」ボタンが `/settings/profile` に遷移する。

## テスト要件

- 手動テスト観点:
  - 未ログイン状態で `/settings` にアクセスするとログイン誘導が出る。
  - ログイン状態で `/settings` にアクセスするとプロフィールセクションが既定で開く。
  - 既存の `/me/edit` URL をブックマークから踏んでもエラーなく `/settings/profile` に到達する。
  - bio / banner の保存→Toast 表示→自プロフィールに遷移、まで従来どおり動作する。
  - 自プロフィール画面の「プロフィール編集」ボタンが新 URL に遷移する。
- 自動テストはこのリポジトリでは追加しない（テスト基盤未導入）。

## 技術的な補足

- 「設定」セクションの拡張余地として、本タスクではプロフィールのみ実装するが、ナビ（左メニュー）はプリミティブ化しておくと次の追加（通知/アカウント連携など）の差分が UI レベルだけで済む。実装コストが嵩む場合は単純な `<ul>` + `<NavLink>` 程度で十分。
- AuthCore で編集する項目（display_name / display_id / アイコン）は引き続き「AuthCore 側で編集してください」という案内テキストを残す。`MyProfileEditRoute` 内の同文言を移植先に持っていく。
- ルート構成は「親ルート + index/子ルート」が基本だが、最初の 1 セクションだけならクエリ (`/settings?tab=profile`) で開閉する案もある。今後セクションが 3 個以上になる前に子ルート方式に寄せておく方が破綻しにくい。本タスクは子ルート方式で進める。
- 関連ファイル（絶対パス）:
  - `/home/sheep/dev/fuju/frontend/src/routes/router.tsx`
  - `/home/sheep/dev/fuju/frontend/src/routes/MyProfileEditRoute.tsx`
  - `/home/sheep/dev/fuju/frontend/src/routes/RootLayoutRoute.tsx`
  - `/home/sheep/dev/fuju/frontend/src/routes/UserProfileRoute.tsx`
  - `/home/sheep/dev/fuju/frontend/src/hooks/useProfileEdit.ts`
  - `/home/sheep/dev/fuju/frontend/src/hooks/useMe.ts`
  - `/home/sheep/dev/fuju/frontend/src/ui/layouts/RootLayout.tsx`
