# FUJU SNS フロントエンド - 仕様書

**バージョン**: 1.0  
**最終更新**: 2026-04-16  
**ステータス**: ✅ 確定版（整合性検証済み）

## 📚 関連ドキュメント

- [.agent.md](../.agent.md) - AI 開発ガイドライン
- [.claude](../.claude) - Claude 設定
- [IMPLEMENTATION.md](IMPLEMENTATION.md) - アーキテクチャ・実装方針
- [BACKEND_INTEGRATION.md](BACKEND_INTEGRATION.md) - バックエンド API 整合性

---

## 1. 概要

### 1.1 プロジェクト概要

FUJU は、ユーザーが投稿を共有し、コメント機能を通じてコミュニケーションを行うSNS（Social Network Service）の Web フロントエンドです。

- **プロジェクト名**: FUJU Frontend
- **言語**: TypeScript
- **フレームワーク**: React 19 + Vite
- **対象**:
  - Web ブラウザ（モダンブラウザ、デスクトップ・モバイル対応）
  - バックエンド: <https://github.com/NxTECH-studio/fuju-sns-backend/>

### 1.2 プロジェクト目標

1. **ユーザー認証の実装**: OAuth2.0（Web ブラウザはセッションクッキー）
2. **投稿機能**: ユーザーが投稿を作成・削除・表示
3. **コメント機能**: 投稿に対してコメント追加・削除
4. **ユーザープロフィール**: ユーザー情報表示及び編集
5. **タイムラインフィード**: 投稿一覧の表示とページネーション
6. **レスポンシブデザイン**: モバイル・デスクトップ対応
7. **エラーハンドリング**: 適切なエラー表示及びリカバリ

---

## 2. 機能要件

### 2.1 認証フロー（Web - セッションベース）

#### ユースケース: ユーザーログイン

**前提条件**: ユーザーがログイン画面を訪問

**フロー**:

1. ユーザーが「Google でサインイン」ボタンをクリック
2. フロントエンドがバックエンド `POST /auth/oauth/authorize` へリクエスト
3. バックエンドが OAuth2 認可 URL を返す
4. フロントエンドが認可 URL へリダイレクト
5. ユーザーが OAuth2 プロバイダーで認可
6. プロバイダーがリダイレクト URI へコールバック
7. フロントエンドが `POST /auth/oauth/callback` に authorization code と state を送信
8. バックエンドがセッションクッキーを設定してレスポンス
9. フロントエンドがセッションをメモリに保存し、ダッシュボードへリダイレクト

**セキュリティ考慮**:

- OAuth2 state パラメータで CSRF 攻撃を防止
- クッキーは HttpOnly, Secure, SameSite=Strict で設定（バックエンド）
- フロントエンドは `credentials: 'include'` で automatic cookie handling を有効化

#### ユースケース: ユーザーログアウト

**フロー**:

1. ユーザーがログアウトボタンをクリック
2. フロントエンドが `POST /auth/logout` へリクエスト
3. バックエンドがセッションを無効化
4. フロントエンドがメモリの認証情報をクリア
5. ログイン画面へリダイレクト

### 2.2 ユーザー機能

#### 2.2.1 ユーザープロフィール表示

**エンドポイント**:

- `GET /users/{id}` - ユーザー詳細取得
- `GET /users` - ユーザーリスト取得（限定）

**要件**:

- ユーザー ID でユーザー詳細を取得・表示
- ユーザーの表示名、自己紹介、アバター画像を表示
- ユーザーの投稿一覧を別途タイムラインで表示

#### 2.2.2 プロフィール編集

**エンドポイント**:

- `PUT /users/{id}` - プロフィール更新

**要件**:

- 現在のユーザーが自分のプロフィール情報を編集可能
- 更新対象: 表示名、自己紹介、アバター画像 URL
- エディット画面でリアルタイムバリデーション実施
- 成功/失敗メッセージを表示

#### 2.2.3 新規ユーザー作成

**エンドポイント**:

- `POST /users` - ユーザープロフィール作成

**要件**:

- OAuth2 ログイン後、初回ユーザーの場合にプロフィール作成フローを表示
- ユーザー名（必須、3-50文字）、表示名、自己紹介、アバター URL を入力
- 重複チェック（username）はバックエンド側で実施

### 2.3 投稿機能

#### 2.3.1 タイムラインフィード表示

**エンドポイント**:

- `GET /posts` - 投稿リスト取得（ページネーション）

**要件**:

- メインページでタイムラインフィードを表示
- ページネーション: limit（デフォルト20, 最大100）, offset をサポート
- 投稿者情報、投稿内容、画像、いいね数、コメント数を表示
- 無限スクロール（ページ下部到達時に次のページを自動読み込み）

#### 2.3.2 投稿作成

**エンドポイント**:

- `POST /posts` - 投稿作成

**要件**:

- 認証済みユーザーのみ投稿作成可能
- フォーム内容: 投稿テキスト（必須、1-5000文字）、画像 URL（オプション、最大10枚）
- リアルタイム文字数カウンター表示
- 画像プレビュー機能
- 送信ボタン は validation パスまでディセーブル

#### 2.3.3 投稿詳細表示

**エンドポイント**:

- `GET /posts/{id}` - 投稿詳細取得

**要件**:

- 投稿 ID で投稿詳細を表示
- 投稿者情報、コンテンツ、画像、メタ情報を表示
- 関連コメント一覧も表示

#### 2.3.4 投稿削除

**エンドポイント**:

- `DELETE /posts/{id}` - 投稿削除

**要件**:

- 投稿者のみが削除可能
- 削除確認ダイアログを表示
- 削除成功後、タイムラインをリロード

### 2.4 コメント機能

#### 2.4.1 コメント表示

**エンドポイント**:

- `GET /posts/{id}` が コメント情報を含む

**要件**:

- 投稿詳細ページでコメント一覧を表示
- コメント投稿者、内容、作成日時を表示

#### 2.4.2 コメント追加

**エンドポイント**:

- `POST /posts/{id}/comments` - コメント追加

**要件**:

- 認証済みユーザーのみコメント追加可能
- フォーム内容: コメントテキスト（必須、1-1000文字）
- リアルタイム文字数カウンター
- 成功後、コメント一覧をリアルタイム更新

#### 2.4.3 コメント削除

**エンドポイント**:

- `DELETE /posts/{post_id}/comments/{comment_id}` - コメント削除

**要件**:

- コメント投稿者のみ削除可能
- 削除確認ダイアログを表示
- 削除成功後、コメント一覧をリアルタイム更新

---

## 3. 非機能要件

### 3.1 パフォーマンス

- ページロード時間: 3秒以内（3G 回線想定）
- API レスポンス: 1秒以内（バックエンド側）
- タイムラインスクロール: フレームレート 60fps 維持

### 3.2 セキュリティ

- **認証**: OAuth2.0 + Session Cookie（Web）
- **通信**: HTTPS over TLS 1.2 以上（本番環境）
- **入力検証**: XSS 対策（React の自動エスケープ）
- **CSRF**: state トークン（バックエンド実装）
- **機密情報**:
  - トークン・パスワードは localStorage に保存しない
  - HttpOnly Cookie を活用（バックエンド側で設定）

### 3.3 可用性

- **ブラウザ対応**: Chrome, Firefox, Safari, Edge の最新版
- **モバイル対応**: iOS Safari, Chrome for Android
- **レスポンシブ**: 320px 以上推奨

### 3.4 保守性

- **テストカバレッジ**: 80% 以上
- **型安全性**: TypeScript strict mode
- **コード品質**: ESLint + Prettier による自動フォーマット

---

## 4. コンポーネント設計

### 4.1 主要コンポーネント

```
App
├── Header
│   ├── Logo
│   ├── Navigation
│   └── UserMenu
├── Main Routes
│   ├── LoginPage
│   ├── AuthCallbackHandler
│   ├── Dashboard (Protected)
│   │   ├── Timeline
│   │   │   ├── PostList
│   │   │   │   └── PostCard
│   │   │   │       └── CommentSection
│   │   │   └── CreatePostForm
│   │   └── Sidebar
│   │       └── UserProfile
│   ├── UserProfilePage
│   │   ├── UserHeader
│   │   ├── UserProfileEditor
│   │   └── UserPostList
│   ├── PostDetailPage
│   │   ├── PostDetail
│   │   ├── CommentSection
│   │   └── CommentForm
│   └── ErrorPage
└── Footer
```

### 4.2 カスタムフック設計

```
useAuth               # 認証状態・ログイン・ログアウト処理
useUser              # ユーザー情報取得
useUsers             # ユーザーリスト取得（ページネーション）
usePosts             # 投稿リスト取得（ページネーション、無限スクロール）
usePost              # 投稿詳細取得
useComments          # コメント関連操作
useCreatePost        # 投稿作成
useAuthCallback      # OAuth2 コールバック処理
```

### 4.3 Utility / Service 層

```
src/utils/
├── apiClient.ts      # API クライアント（fetch wrapper）
├── errorHandler.ts   # エラーハンドリング
├── constants.ts      # 定数・環境変数
└── validators.ts     # 入力検証ロジック

src/types/
├── api.ts            # API リクエスト・レスポンス型
└── domain.ts         # User, Post, Comment 等ドメイン型
```

---

## 5. データフロー

### 5.1 認証フロー図

```
[Login Page]
    ↓
[Click "Sign in with Google"]
    ↓
[Frontend: POST /auth/oauth/authorize {provider: "google"}]
    ↓
[Backend returns: {redirect_url: "..."}]
    ↓
[Frontend: window.location.href = redirect_url]
    ↓
[User authenticates at Google]
    ↓
[Google redirects to: {callback_uri}?code={code}&state={state}]
    ↓
[AuthCallbackHandler: POST /auth/oauth/callback {code, state, device_type: "web"}]
    ↓
[Backend: Set-Cookie: session_id=...;HttpOnly;Secure]
    ↓
[Frontend: Store session info in state/context]
    ↓
[Redirect to Dashboard]
```

### 5.2 タイムラインデータフロー

```
[Dashboard mounted]
    ↓
[Hook: usePosts() configured with limit=20, offset=0]
    ↓
[Frontend: GET /posts?limit=20&offset=0]
    ↓
[Backend returns: {data: [...], total, limit, offset}]
    ↓
[Display PostList component]
    ↓
[User scrolls to bottom]
    ↓
[Trigger: fetch next page (offset += 20)]
    ↓
[Append new posts to list (infinite scroll)]
```

---

## 6. API 統合

### 6.1 認証関連 Endpoints

| メソッド | エンドポイント | 説明 |
|---------|---|---|
| POST | `/auth/oauth/authorize` | OAuth2 認可 URL 生成 |
| POST | `/auth/oauth/callback` | OAuth2 コールバック処理 |
| POST | `/auth/refresh` | JWT リフレッシュ（モバイル用） |
| POST | `/auth/logout` | ログアウト |

### 6.2 ユーザー関連 Endpoints

| メソッド | エンドポイント | 説明 |
|---------|---|---|
| GET | `/users` | ユーザーリスト取得 |
| POST | `/users` | ユーザープロフィール作成 |
| GET | `/users/{id}` | ユーザー詳細取得 |
| PUT | `/users/{id}` | プロフィール更新 |

### 6.3 投稿関連 Endpoints

| メソッド | エンドポイント | 説明 |
|---------|---|---|
| GET | `/posts` | 投稿リスト（ページネーション） |
| POST | `/posts` | 投稿作成 |
| GET | `/posts/{id}` | 投稿詳細 |
| DELETE | `/posts/{id}` | 投稿削除 |

### 6.4 コメント関連 Endpoints

| メソッド | エンドポイント | 説明 |
|---------|---|---|
| POST | `/posts/{id}/comments` | コメント追加 |
| DELETE | `/posts/{post_id}/comments/{comment_id}` | コメント削除 |

---

## 7. エラーハンドリング

### 7.1 エラー応答フォーマット

```json
{
  "code": "INVALID_REQUEST",
  "message": "Email is required",
  "timestamp": "2026-04-16T10:30:00Z"
}
```

### 7.2 主要エラーコード

| Code | HTTP | 意味 | 対応 |
|------|------|------|------|
| INVALID_REQUEST | 400 | リクエスト不正 | ユーザーに修正させる |
| UNAUTHORIZED | 401 | 認証なし/期限切れ | ログイン画面へ |
| FORBIDDEN | 403 | 権限なし | エラーメッセージ表示 |
| NOT_FOUND | 404 | リソース見つからない | エラーメッセージ表示 |
| CONFLICT | 409 | 競合（ユーザー名重複等） | ユーザーに通知 |
| SERVER_ERROR | 500 | サーバーエラー | 再試行促促 |

### 7.3 Error Boundary 実装

- ページ全体をキャッチしてフォールバック表示
- ユーザーにわかりやすいエラーメッセージを表示
- ログは開発者向けに出力

---

## 8. 環境設定

### 8.1 環境変数

```env
# .env.local (開発環境)
VITE_API_URL=http://localhost:8080/v1
VITE_OAUTH_CLIENT_ID=your_dev_client_id
VITE_OAUTH_REDIRECT_URI=http://localhost:5173/auth/callback
VITE_ENVIRONMENT=development

# .env.production (本番環境)
VITE_API_URL=https://api.fuju.local/v1
VITE_OAUTH_CLIENT_ID=your_prod_client_id
VITE_OAUTH_REDIRECT_URI=https://app.fuju.local/auth/callback
VITE_ENVIRONMENT=production
```

---

## 9. テスト戦略

### 9.1 テストレベル

1. **ユニットテスト**: コンポーネント、フック、ユーティリティ
   - 対象: 全ロジック
   - ツール: Vitest / Jest + React Testing Library
   - カバレッジ: 80%+

2. **インテグレーションテスト**: API 統合、複数コンポーネント連携
   - 対象: 主要フロー（ログイン、投稿作成等）
   - ツール: React Testing Library + MSW (Mock Service Worker)

3. **E2E テスト**: 本番環境シミュレーション
   - 対象: 重要なユーザージャーニー
   - ツール: Cypress or Playwright

### 9.2 テストカバレッジ目標

- `src/components/`: 80%+
- `src/hooks/`: 85%+
- `src/utils/`: 90%+

---

## 10. デリバリー計画

### Phase 1: 基盤構築（1週間）

- [ ] プロジェクト初期化
- [ ] API クライアント実装
- [ ] 認証フロー実装
- [ ] Error Boundary 実装

### Phase 2: 主要機能（2週間）

- [ ] ユーザープロフィール機能
- [ ] 投稿作成・表示機能
- [ ] コメント機能
- [ ] タイムラインフィード

### Phase 3: 最適化・テスト（1週間）

- [ ] テスト実装（カバレッジ 80%+）
- [ ] レスポンシブデザイン調整
- [ ] パフォーマンス最適化

### Phase 4: CI/CD・デプロイ（1週間）

- [ ] GitHub Actions パイプライン構築
- [ ] Lint / Build / Test 自動化
- [ ] AI コードレビュー統合
- [ ] ステージング・本番デプロイ

---

## 11. 外部依存性

### 11.1 バックエンド依存性

- **Repository**: <https://github.com/NxTECH-studio/fuju-sns-backend/>
- **Base URL**:
  - Dev: `http://localhost:8080/v1`
  - Prod: `https://api.fuju.local/v1`
- **認証**: OAuth2.0（Google, GitHub）
- **API 仕様**: swagger.yaml 参照

### 11.2 OAuth2 プロバイダー

- Google OAuth2
- GitHub OAuth2
（バックエンド で設定）

---

## 12. セキュリティ考慮事項

### 12.1 実装上の注意

1. **HTTPS の強制**: 本番環境で HTTPS のみ使用
2. **Cookie セキュリティ**: HttpOnly, Secure, SameSite をバックエンドで設定
3. **XSS 対策**: React の自動エスケープ、DOMPurify 活用
4. **CSRF 対策**: state トークン（バックエンド実装）
5. **認証情報の管理**:
   - ローカルに JWT を保存しない（セッションクッキー使用）
   - トークンをメモリに一時保存
6. **Content Security Policy (CSP)**: Vite で設定推奨
7. **依存パッケージの脆弱性**: `npm audit` で定期確認

---

## 13. スコープ・制約事項

### 13.1 MVP（Minimum Viable Product）スコープ

このドキュメントで定義される機能は **Phase 1-4** をカバーする MVP 版です。

#### ✅ 含まれる機能

- OAuth2 ログイン・ログアウト（Web セッションベース）
- ユーザープロフィール：表示・編集・作成
- 投稿：作成・表示・削除（基本的な CRUD）
- コメント：追加・削除（基本的な CRUD）
- タイムラインフィード：ページネーション + 無限スクロール
- エラーハンドリング・バリデーション
- レスポンシブデザイン（モバイル・デスクトップ）

#### ❌ Phase 2 以降の拡張（Out of Scope）

以下の機能は MVP に含まれず、将来のフェーズで実装を検討します：

1. **Like/リアクション機能**: 投稿・コメントへの評価機能
2. **フォロー/フォロワー**: ユーザー間の関係構築
3. **通知（Notification）**: 投稿・コメント・リアクションの行動通知
4. **検索機能**: ユーザー・投稿検索
5. **ハッシュタグ**: 投稿のカテゴリ分類
6. **メンション**: コメント・投稿内でのユーザータグ付け
7. **シェア/リツイート的機能**: 投稿の再共有
8. **ダイレクトメッセージ**: プライベート通信
9. **投稿編集**: 既存投稿の編集機能（削除のみ実装）
10. **リアルタイム通知**: WebSocket による即時通知
11. **プライバシー設定**: 投稿の公開範囲制御
12. **ブロック/報告機能**: ユーザー管理・モデレーション

### 13.2 設計上の制約

#### セッション管理

- Web クライアントは **Session Cookie のみ** サポート（JWT は将来の検討事項）
- クッキーの TTL はバックエンド側で管理
- セッション有効期限切れ時は自動的にログアウト画面へリダイレクト

#### 画像処理

- 画像 URL は手入力または外部 URL のみ（アップロード機能は含まない）
- 画像のリサイズ・最適化はフロント側では実施しない（バックエンドに委譲）
- 最大リクエストサイズは 5MB（バックエンド側で設定）

#### ページネーション

- タイムラインは無限スクロールのみ（ページング UI は無し）
- ユーザーリストは通常ページネーション（詳細は未定義）
- 1 ページあたり最大 100 件（バックエンド制限）

#### 権限管理

- 投稿・コメント削除：投稿者本人のみ
- プロフィール編集：本人のみ
- 管理者機能や削除取消機能は含まない

---

## 14. 将来拡張の設計考慮

### 14.1 拡張性を考慮した設計パターン

現在の設計は、以下の拡張を見据えた構造になっています。

#### Like/リアクション機能追加の想定パターン

```typescript
// 将来の Hook 設計（参考）
const useLikePost = (postId: number) => {
  const [isLiked, setIsLiked] = React.useState(false);
  const [count, setCount] = React.useState(0);

  const toggleLike = async () => {
    try {
      if (isLiked) {
        await apiClient.delete(`/posts/${postId}/likes`);
      } else {
        await apiClient.post(`/posts/${postId}/likes`, {});
      }
      setIsLiked(!isLiked);
      setCount(isLiked ? count - 1 : count + 1);
    } catch (error) {
      // error handling
    }
  };

  return { isLiked, count, toggleLike };
};

// Component 使用時も最小限の変更で対応可能
<PostCard post={post} onLike={(postId) => refetch()} />
```

#### フォロー機能追加の想定パターン

```typescript
// Hook の追加のみで対応（Component への影響最小化）
const useFollowUser = (userId: number) => {
  const [isFollowing, setIsFollowing] = React.useState(false);

  const toggleFollow = async () => {
    try {
      if (isFollowing) {
        await apiClient.delete(`/users/${userId}/following`);
      } else {
        await apiClient.post(`/users/${userId}/following`, {});
      }
      setIsFollowing(!isFollowing);
    } catch (error) {
      // error handling
    }
  };

  return { isFollowing, toggleFollow };
};
```

#### 通知機能追加の想定パターン

```typescript
// 新しい Context + Hook で実装
interface Notification {
  id: number;
  type: 'like' | 'comment' | 'follow';
  actor: User;
  resource: Post | Comment;
  createdAt: string;
}

const NotificationContext = React.createContext<...>(...);

const useNotifications = () => {
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  
  // WebSocket または polling で通知取得
  React.useEffect(() => {
    const unsubscribe = subscribeToNotifications((newNotification) => {
      setNotifications(prev => [newNotification, ...prev]);
    });
    return unsubscribe;
  }, []);

  return { notifications };
};
```

### 14.2 API レイヤーの拡張戦略

現在の `apiClient` 設計により、新しいエンドポイント追加時は：

1. **API 型定義追加**: `src/types/api.ts` に新しい Request/Response 型追加
2. **Hook 実装**: 新しい Hook ファイルを追加（例: `useNotifications.ts`）
3. **Component 修正**: 新 Hook を既存 Component に統合

❌ `apiClient` 本体の修正は不要（設計の汎用性）

### 14.3 フロントエンド固有の拡張ポイント

#### キャッシング戦略（将来実装推奨）

- ユーザー情報: 1 時間キャッシュ
- 投稿リスト: リアルタイム（キャッシュ無し）
- コメント: 5 分キャッシュ

#### オフラインサポート（長期検討）

- Service Worker による offline-first 設計
- LocalStorage への一時保存
- 接続復帰時の自動 sync

#### パフォーマンス最適化（フェーズ 3 後半以降）

- バーチャルスクロール（大量投稿時）
- 画像遅延ロード
- Code splitting（ページごと）
- Bundle analysis と optimization

---

## 15. ドキュメント更新ガイド

### 15.1 今後のドキュメント保守

このドキュメントは以下のタイミングで更新されます：

1. **機能追加時**: Out of Scope から該当機能を移行、新セクション追加
2. **仕様変更時**: バージョン番号更新、変更ログ記載
3. **バグ修正時**: 「既知の問題」セクションに記載（新セクション追加予定）

### 15.2 バージョン管理方針

- **1.x**: MVP 機能の改善・バグ修正
- **2.0**: Like/フォロー機能追加
- **2.x**: 通知機能・検索機能追加
- **3.0**: ダイレクトメッセージ・高度な機能追加

---

**ドキュメント確定**: ✅ 2026-04-16  
**次の更新予定**: Phase 2 機能確定時（約 1 ヶ月後）
