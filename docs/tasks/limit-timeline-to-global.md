# タイムラインをグローバルに限定する

## 概要

Home（フォロー）タイムラインの導線を撤去し、ルート `/` をグローバルタイムラインに統一する。
ヘッダの「Home / Global」のナビ分岐をやめ、タイムラインリンクを 1 本にまとめる。

## 背景・目的

- 現状はルート `/` が Home（フォロー中ユーザの投稿）、`/global` が Global（全体）の 2 タイムライン構成。
- 一方で本フェーズではフォロー機能をまだ十分に活用しておらず、Home に立ち寄っても多くのユーザにとって投稿が空になりやすく、初期体験を損なっている。
- 当面はタイムラインを Global の 1 種類だけに絞り、UI を単純化したい。Home（フォロー）はフォロー機能を改めて整備するタイミングで再度入れ直す前提で、コードは「無効化」ではなく「導線・ルートから外す」レベルで撤去する（バックエンド `/timeline/home` は残してよい）。
- `/global` URL を踏んでいる外部リンクや既存のブックマーク互換のため、URL レベルでは `/global` も生かしておく（`/` と同等の表示）。

## 影響範囲

- 変更:
  - `src/routes/router.tsx`:
    - `index` の要素を `HomeTimelineRoute` から `GlobalTimelineRoute` に変更。
    - `path="global"` のルートは残し、こちらも `GlobalTimelineRoute` を割り当てる（`/` と `/global` の双方が同じ表示）。代替案として `/global` を `/` にリダイレクトする方式 (`<Navigate to="/" replace />`) もある（後述）。
    - `HomeTimelineRoute` の import を削除。
  - `src/routes/RootLayoutRoute.tsx`:
    - `navLinks` から `Home` と `Global` の 2 つを統合し、「タイムライン」 1 本にする。`to: "/"` で `active` 判定は `location.pathname === "/" || location.pathname.startsWith("/global")`。
  - `src/routes/GlobalTimelineRoute.tsx`:
    - 見出しを「Global」から「タイムライン」（または単に「ホーム」）に変更し、HomeTimelineRoute にあった `ComposerBox`（投稿フォーム）を移植する。投稿後は `prepend` で先頭に表示する既存ロジックを流用する（`useTimelineController("global")` の `onCreate` をそのまま使える）。
    - 未ログインでも閲覧は可能だが、投稿フォームはログイン時のみ表示する（`useAuthStatus()` を見て `ComposerBox` を条件付きレンダリング）。
  - `src/hooks/useTimelineController.ts` / `src/hooks/useTimeline.ts`: 変更不要（`kind: "home"` の経路は使われなくなるが残しておく。フォロー再導入時に再利用するため）。
- 削除:
  - `src/routes/HomeTimelineRoute.tsx`: 役割が無くなるため削除。
- 残置（変更しない）:
  - `src/api/endpoints/timelines.ts` の `timelinesHome`: バックエンド側エンドポイントが残るので、フロントの API 関数も残しておく（参照される箇所はなくなるが、再導入のコストを下げるため）。

破壊的変更は URL レベルでは無し（`/` の挙動が変わる程度）。`HomeTimelineRoute` を import している外部コードは想定なし。

## 実装ステップ

1. `src/routes/GlobalTimelineRoute.tsx` を更新。
   - 既存の `useTimelineController("global")`、`PostRow`、`Pager`、`AsyncView`、`EmptyState` の構成は維持。
   - `ComposerBox` を import し、`useAuthStatus().status === "authenticated"` のときに見出し直下に描画する。`onSubmit={ctrl.onCreate}` を渡す。
   - 見出しを「Global」から「ホーム」または「タイムライン」に変更（チームの好みで決める。本タスクでは「ホーム」を採用）。
   - 未ログイン時の空表示は既存の `EmptyState` のままでよい（タイトル「まだ投稿がありません」）。
2. `src/routes/router.tsx` を更新。
   - `HomeTimelineRoute` の import を削除。
   - `<Route index element={<HomeTimelineRoute />} />` を `<Route index element={<GlobalTimelineRoute />} />` に変更。
   - `<Route path="global" element={<GlobalTimelineRoute />} />` は残す。
3. `src/routes/RootLayoutRoute.tsx` の `navLinks` を更新。
   - 既存の Home / Global の 2 リンクを 1 つに統合。
   - 例:
     ```ts
     {
       to: "/",
       label: "ホーム",
       active: location.pathname === "/" || location.pathname.startsWith("/global"),
     }
     ```
4. `src/routes/HomeTimelineRoute.tsx` を削除し、未使用 import を整理する（`router.tsx` 側）。
5. 動作確認:
   - 未ログインで `/` にアクセスして Global の投稿一覧が表示される。
   - ログイン状態で `/` を開くと一覧の上に投稿フォームが出て、投稿が即時にタイムライン先頭に追加される。
   - 旧 URL `/global` を踏んでも同じ画面が出る。
   - ヘッダのナビが「ホーム」1 本になっている。
   - 「Global を見る」CTA を表示していた箇所が無くなっていることを確認（`HomeTimelineRoute` 削除に伴い不要化）。

## テスト要件

- 手動テスト観点:
  - 未ログイン: `/` で投稿一覧が見える、投稿フォームは出ない、ヘッダにログインボタンが出る。
  - ログイン: `/` で投稿フォームが出る、投稿→Toast→先頭に追加。
  - 既存 URL: `/global` が同じ表示になる（または `/` にリダイレクトされる方針なら、リダイレクト先で同等の表示）。
  - 投稿カードの操作（削除/Like/著者プロフィール遷移/詳細遷移）が従来通り機能する。
- 自動テストはこのリポジトリでは追加しない（テスト基盤未導入）。

## 技術的な補足

- フォロー機能 (`useFollowToggle` / `FollowButton` / `FollowControl` / `FollowListRoute`) は今回のスコープでは触らない。Global タイムラインのカードに表示される「フォローする」ボタンも従来どおり残る（`PostRow` の流儀に従う）。
- バックエンド側の `/timeline/home` を呼ぶ口がフロントから無くなるので、開発者ツールのネットワークタブから `/timeline/home` 系リクエストが消えていることを確認すると差し戻しに気付きやすい。
- 代替案: `/global` を `<Navigate to="/" replace />` にしてしまう案もある。SEO / 既存リンクの保持を優先するなら現案（同じコンポーネントを 2 ルートに割り当て）が無難。導線を 1 つに寄せたい意図が強いならリダイレクトの方が将来の混乱が少ない。
- 「ホーム」というラベルは旧 Home（フォロー）と紛らわしいため、チームでラベル合意が必要。代替候補: 「タイムライン」「みんなの投稿」。本ドキュメントでは仮に「ホーム」とする。
- 関連ファイル（絶対パス）:
  - `/home/sheep/dev/fuju/frontend/src/routes/router.tsx`
  - `/home/sheep/dev/fuju/frontend/src/routes/HomeTimelineRoute.tsx`
  - `/home/sheep/dev/fuju/frontend/src/routes/GlobalTimelineRoute.tsx`
  - `/home/sheep/dev/fuju/frontend/src/routes/RootLayoutRoute.tsx`
  - `/home/sheep/dev/fuju/frontend/src/routes/ComposerBox.tsx`
  - `/home/sheep/dev/fuju/frontend/src/hooks/useTimelineController.ts`
  - `/home/sheep/dev/fuju/frontend/src/hooks/useTimeline.ts`
  - `/home/sheep/dev/fuju/frontend/src/api/endpoints/timelines.ts`
