# FUJU SNS フロントエンド - 実装方針書

**バージョン**: 1.0  
**最終更新**: 2026-04-16  
**ステータス**: ドラフト

---

## 1. 実装アーキテクチャ

### 1.1 全体アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                    React Application                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │             Components Layer (View)                  │  │
│  │  - Page Components (Dashboard, Profile, etc.)       │  │
│  │  - Feature Components (PostCard, CommentForm, etc.)│  │
│  │  - UI Components (Button, Input, Loading, etc.)     │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Hooks Layer (Business Logic)           │  │
│  │  - useAuth (認証状態管理)                          │  │
│  │  - usePosts, useUser, useComments (データ取得)    │  │
│  │  - useCreatePost (作成・更新ロジック)             │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │            Utilities & Services Layer               │  │
│  │  - apiClient (API 通信)                            │  │
│  │  - errorHandler, validators (ロジック処理)        │  │
│  │  - constants (環境変数、定数)                      │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         ↓ API 通信 ↓
┌─────────────────────────────────────────────────────────────┐
│               Backend API (http://localhost:8080/v1)         │
│  - Authentication (OAuth2)                                 │
│  - Users, Posts, Comments CRUD                           │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 データフロー（Redux 不要）

**状態管理戦略**: React Hooks + Context API で軽量実装

```
User Action (クリック等)
    ↓
Component Event Handler
    ↓
Hook Call (useCreatePost, usePosts等)
    ↓
API Client (fetch wrapper)
    ↓
Backend API
    ↓
Response → Hook (state update: loading, error, data)
    ↓
Component Re-render
    ↓
UI Update
```

---

## 2. 技術スタック決定理由

### 2.1 フレームワーク選定

| 選定項目               | 採用技術   | 理由                                |
| ---------------------- | ---------- | ----------------------------------- |
| ライブラリ             | React 19   | モダン、ES2021+ 対応、JSX           |
| 言語                   | TypeScript | 型安全性、IDE サポート、エラー防止  |
| ビルドツール           | Vite       | 高速、ES modules 対応、開発 DX 向上 |
| パッケージマネージャー | npm        | 標準、ecosystem 充実                |

### 2.2 状態管理

**エプローチ**: React Hooks + Context API（Redux 不要）

**理由**:

- 小〜中規模プロジェクトには過剰な複雑性
- Hooks で十分な機能性
- バンドルサイズ削減

```typescript
// Example: AuthContext で認証状態を管理
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (provider: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    // 初期化: セッション確認
    checkSession();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

### 2.3 API 通信

**ツール**: 標準 `fetch` API（サードパーティライブラリ不要）

```typescript
// API クライアント実装
class ApiClient {
  private baseUrl: string;
  private token?: string;

  async request<T>(method: string, endpoint: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = { 'Content-Type': 'application/json' };

    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const response = await fetch(url, {
      method,
      headers,
      credentials: 'include', // Session cookie
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new ApiError(response.status, await response.text());
    }

    return response.json();
  }
}
```

### 2.4 スタイリング

**アプローチ**: CSS + CSS Modules + CSS Variables

```typescript
// src/styles/variables.css
:root {
  --color-primary: #007bff;
  --color-danger: #dc3545;
  --spacing-md: 1rem;
  --font-size-body: 1rem;
}

// src/components/UserProfile/UserProfile.module.css
.profile { padding: var(--spacing-md); }
.name { color: var(--color-primary); }

// src/components/UserProfile/UserProfile.tsx
import styles from './UserProfile.module.css';

export const UserProfile = ({ user }: Props) => (
  <div className={styles.profile}>
    <h1 className={styles.name}>{user.display_name}</h1>
  </div>
);
```

### 2.5 テスティング

- **ユニットテスト**: Vitest + React Testing Library
- **E2E テスト**: Cypress（将来）
- **API モック**: MSW (Mock Service Worker)

**理由**:

- React Testing Library: 実装詳細に依存しない、ユーザー視点のテスト
- Vitest: Vite ネイティブ、高速
- MSW: API レベルでのモック

---

## 3. プロジェクト構造

### 3.1 ディレクトリ構成

```
frontend/
├── .agent.md                    # AI 開発ガイドライン
├── .claude                      # Claude 設定
├── .env.local                   # 環境変数（ローカル）
├── .gitignore
├── eslint.config.js            # ESLint 設定
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── index.html                  # Entry HTML
├── vite.config.ts              # Vite 設定
├── vitest.config.ts            # Vitest 設定（テスト用）
│
├── src/
│   ├── main.tsx                # React entry point
│   ├── App.tsx                 # Root component
│   ├── App.css                 # Global styles
│   ├── index.css               # Reset / base styles
│   │
│   ├── components/             # UI & Feature Components
│   │   ├── Auth/
│   │   │   ├── LoginButton.tsx
│   │   │   ├── LogoutButton.tsx
│   │   │   ├── LoginButton.test.tsx
│   │   │   ├── AuthGuard.tsx
│   │   │   └── AuthCallbackHandler.tsx
│   │   ├── Users/
│   │   │   ├── UserProfile.tsx
│   │   │   ├── UserProfile.module.css
│   │   │   ├── UserProfile.test.tsx
│   │   │   ├── UserCard.tsx
│   │   │   ├── UserList.tsx
│   │   │   └── UserEditForm.tsx
│   │   ├── Posts/
│   │   │   ├── PostCard.tsx
│   │   │   ├── PostCard.module.css
│   │   │   ├── PostCard.test.tsx
│   │   │   ├── PostList.tsx
│   │   │   ├── CreatePostForm.tsx
│   │   │   └── PostDetail.tsx
│   │   ├── Comments/
│   │   │   ├── CommentSection.tsx
│   │   │   ├── CommentForm.tsx
│   │   │   ├── CommentItem.tsx
│   │   │   └── CommentForm.test.tsx
│   │   ├── Common/
│   │   │   ├── Loading.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── ErrorMessage.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── Header.module.css
│   │   │   └── Footer.tsx
│   │   └── Layout/
│   │       ├── MainLayout.tsx
│   │       └── MainLayout.module.css
│   │
│   ├── hooks/                  # Custom Hooks
│   │   ├── useAuth.ts
│   │   ├── useAuth.test.ts
│   │   ├── useUser.ts
│   │   ├── useUser.test.ts
│   │   ├── usePosts.ts
│   │   ├── usePosts.test.ts
│   │   ├── useComments.ts
│   │   ├── useCreatePost.ts
│   │   ├── useAuthCallback.ts
│   │   └── useInfiniteScroll.ts
│   │
│   ├── types/                  # TypeScript Type Definitions
│   │   ├── api.ts              # API request/response types
│   │   ├── domain.ts           # Domain models (User, Post, Comment)
│   │   └── index.ts            # Barrel export
│   │
│   ├── utils/                  # Utility Functions
│   │   ├── apiClient.ts        # API client instance
│   │   ├── apiClient.test.ts
│   │   ├── errorHandler.ts     # Error handling
│   │   ├── errorHandler.test.ts
│   │   ├── validators.ts       # Input validation
│   │   ├── validators.test.ts
│   │   ├── constants.ts        # Constants & config
│   │   └── logger.ts           # Logging utility
│   │
│   ├── pages/                  # Page Components
│   │   ├── LoginPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── UserProfilePage.tsx
│   │   ├── PostDetailPage.tsx
│   │   ├── NotFoundPage.tsx
│   │   └── ErrorPage.tsx
│   │
│   ├── context/                # Context API
│   │   ├── AuthContext.tsx
│   │   └── AuthContext.test.tsx
│   │
│   ├── styles/                 # Global Styles
│   │   ├── variables.css       # CSS variables
│   │   ├── globals.css         # Global styles
│   │   ├── responsive.css      # Responsive breakpoints
│   │   └── animations.css      # Animations
│   │
│   ├── services/               # External Services
│   │   └── oauthService.ts     # OAuth2 handling
│   │
│   └── App.test.tsx
│
├── public/                     # Static assets
│   └── (images, icons, etc.)
│
├── docs/
│   ├── SPECIFICATION.md        # 仕様書
│   ├── IMPLEMENTATION.md       # 実装方針（このファイル）
│   ├── ARCHITECTURE.md         # アーキテクチャ詳細
│   └── API_INTEGRATION.md      # API 統合ガイド
│
├── .github/
│   ├── workflows/
│   │   ├── lint.yml            # ESLint 自動実行
│   │   ├── test.yml            # テスト自動実行
│   │   ├── build.yml           # ビルド検証
│   │   └── code-review.yml     # AI code review
│   └── copilot-instructions.md # GitHub Copilot 指示
│
└── README.md
```

---

## 4. 実装フェーズ別計画

### Phase 1: 基盤構築（開発環境 + 認証）

#### 1.1 プロジェクト初期化

```bash
# Vite プロジェクト作成
npm create vite@latest fuju-frontend -- --template react-ts

# 依存パッケージインストール
npm install

# 開発依存パッケージ
npm install -D \
  @types/react \
  @types/react-dom \
  typescript \
  vite \
  vitest \
  @testing-library/react \
  @testing-library/jest-dom

# ESLint & Prettier 設定
npm install -D \
  eslint \
  typescript-eslint \
  eslint-config-prettier \
  prettier
```

#### 1.2 環境設定ファイル

```
- .env.local 作成（API_URL など）
- tsconfig.json strict mode 有効化
- eslint.config.js TypeScript サポート
- vite.config.ts 最適化設定
```

#### 1.3 基本コンポーネント & Hooks

実装順序:

1. `apiClient.ts` - fetch ベースの API ラッパー
2. `useAuthCallback.ts` - OAuth2 コールバック処理
3. `useAuth.ts` - 認証状態管理
4. `AuthProvider.tsx` - 認証コンテキスト
5. `AuthGuard.tsx` - protected route wrapper
6. `LoginPage.tsx` - ログイン画面
7. `LogoutButton.tsx` - ログアウト

### Phase 2: コアナビゲーション & レイアウト

```
- Header.tsx (ナビゲーション)
- Footer.tsx
- MainLayout.tsx
- Router 設定（React Router）
- Pages: Dashboard, UserProfile, PostDetail
```

### Phase 3: ユーザー機能

```
- UserProfile.tsx (表示)
- UserEditForm.tsx (編集)
- useUser.ts hook
- useUsers.ts hook (リスト)
```

### Phase 4: 投稿機能

```
- PostCard.tsx
- PostList.tsx
- CreatePostForm.tsx
- PostDetail.tsx
- usePosts.ts hook（ページネーション +無限スクロール）
- useCreatePost.ts hook
```

### Phase 5: コメント機能

```
- CommentSection.tsx
- CommentForm.tsx
- CommentItem.tsx
- useComments.ts hook
```

### Phase 6: エラーハンドリング & 最適化

```
- ErrorBoundary.tsx
- ErrorMessage.tsx
- エラーレベル別処理
- パフォーマンス最適化（遅延ロード、メモ化）
```

### Phase 7: テスト & CI/CD

```
- ユニットテスト追加（カバレッジ 80%+）
- GitHub Actions パイプライン
- Lint + Build + Test 自動化
- AI code review 統合
```

---

## 5. 認証実装詳細

### 5.1 OAuth2 Flow（Web - セッションベース）

```typescript
// Step 1: ユーザーが "Sign in with Google" クリック
const LoginPage = () => {
  const handleOAuth2Login = async (provider: 'google' | 'github') => {
    try {
      // Backend から OAuth2 認可 URL を取得
      const response = await apiClient.post<{ redirect_url: string }>('/auth/oauth/authorize', {
        provider,
        redirect_uri: import.meta.env.VITE_OAUTH_REDIRECT_URI,
      });
      // ユーザーを OAuth2 プロバイダーへリダイレクト
      window.location.href = response.redirect_url;
    } catch (error) {
      // エラーハンドリング
    }
  };

  return <button onClick={() => handleOAuth2Login('google')}>Sign in with Google</button>;
};

// Step 2: プロバイダーからコールバック (URL: /auth/callback?code=X&state=Y)
const AuthCallbackHandler = () => {
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');

    if (code && state) {
      // Backend に code と state を送信
      apiClient
        .post('/auth/oauth/callback', {
          code,
          state,
          device_type: 'web',
        })
        .then(() => {
          // セッションクッキーが自動設定される
          // ダッシュボードへリダイレクト
          window.location.href = '/dashboard';
        })
        .catch((error) => {
          // エラーハンドリング
          window.location.href = '/login?error=auth_failed';
        });
    }
  }, []);

  return <Loading />;
};

// Step 3: セッション確認（初回ロード）
const useAuth = () => {
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    // クッキーが存在するか確認（GET /users/me）
    apiClient
      .get('/users/me')
      .then((response: ApiResponse<User>) => {
        setUser(response.data);
      })
      .catch(() => {
        // クッキーなし → ログアウト状態
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  return { user, isLoading, isAuthenticated: !!user };
};
```

### 5.2 Session Cookie 自動処理

```typescript
// apiClient で credentials: 'include' を設定
const apiClient = new ApiClient({
  baseUrl: import.meta.env.VITE_API_URL,
  credentials: 'include', // ✅ クッキーを automatic に送信・受信
});

// すべての fetch で自動的にセッションクッキーが使用される
// フロントエンド側での JWT 管理は不要（Web の場合）
```

---

## 6. Error Handling Strategy

### 6.1 エラー分類

```typescript
// 1. API Error（バックエンド由来）
interface ApiError extends Error {
  code: string; // e.g., "INVALID_REQUEST"
  statusCode: number;
  message: string;
  timestamp: string;
}

// 2. Network Error（通信エラー）
interface NetworkError extends Error {
  name: 'NetworkError';
  message: string;
}

// 3. Validation Error（入力検証エラー）
interface ValidationError extends Error {
  name: 'ValidationError';
  field: string;
  message: string;
}

// 4. App Error（アプリロジックエラー）
class AppError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}
```

### 6.2 エラーハンドリング実装

```typescript
// Utility: エラーハンドラー
class ErrorHandler {
  static async handle(error: unknown): Promise<{ code: string; message: string }> {
    if (error instanceof Response) {
      // HTTP レスポンスエラー
      try {
        const data = (await error.json()) as ApiError;
        return { code: data.code, message: data.message };
      } catch {
        return { code: `HTTP_${error.status}`, message: error.statusText };
      }
    }

    if (error instanceof TypeError) {
      // Network error (fetch failed)
      return { code: 'NETWORK_ERROR', message: 'Network request failed' };
    }

    if (error instanceof Error) {
      return { code: 'APP_ERROR', message: error.message };
    }

    return { code: 'UNKNOWN_ERROR', message: 'Unknown error occurred' };
  }
}

// Hook: 統一されたエラーハンドリング
const useData = <T>(fetcher: () => Promise<T>) => {
  const [data, setData] = React.useState<T | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const fetch = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (err) {
      const { message } = await ErrorHandler.handle(err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [fetcher]);

  React.useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, error, isLoading, retry: fetch };
};
```

### 6.3 UI Error Boundary

```typescript
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: string, retry: () => void) => ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, { error: string | null }> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }

  render() {
    if (this.state.error) {
      return (
        this.props.fallback?.(this.state.error, () => this.setState({ error: null })) || (
          <ErrorPage message={this.state.error} />
        )
      );
    }

    return this.props.children;
  }
}
```

---

## 7. Performance 最適化

### 7.1 コード分割

```typescript
// React.lazy で遅延ロード
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));
const UserProfilePage = React.lazy(() => import('./pages/UserProfilePage'));

// Router で使用
<Suspense fallback={<Loading />}>
  <Route path="/dashboard" element={<DashboardPage />} />
  <Route path="/users/:id" element={<UserProfilePage />} />
</Suspense>;
```

### 7.2 メモ化

```typescript
// Component メモ化
const PostCard = React.memo(({ post, onDelete }: Props) => {
  return <div>{post.content}</div>;
});

// Callback メモ化
const usePosts = () => {
  const [posts, setPosts] = React.useState<Post[]>([]);

  const fetchPosts = React.useCallback(async (limit: number, offset: number) => {
    const response = await apiClient.get(`/posts?limit=${limit}&offset=${offset}`);
    setPosts(response.data);
  }, []);

  return { posts, fetchPosts };
};
```

### 7.3 無限スクロール実装

```typescript
const useInfiniteScroll = (fetcher: (offset: number) => Promise<unknown[]>) => {
  const [items, setItems] = React.useState<unknown[]>([]);
  const [offset, setOffset] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(false);
  const observerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (entry.isIntersecting && !isLoading) {
          setIsLoading(true);
          try {
            const newItems = await fetcher(offset);
            setItems((prev) => [...prev, ...newItems]);
            setOffset((prev) => prev + newItems.length);
          } finally {
            setIsLoading(false);
          }
        }
      },
      { threshold: 0.1 },
    );

    if (observerRef.current) observer.observe(observerRef.current);
    return () => observer.disconnect();
  }, [offset, isLoading, fetcher]);

  return { items, isLoading, observerRef };
};
```

---

## 8. Testing 実装方針

### 8.1 ユニットテスト (Component)

```typescript
import { render, screen } from '@testing-library/react';
import { UserProfile } from './UserProfile';

describe('UserProfile', () => {
  it('renders user profile with data', () => {
    const mockUser = {
      id: 1,
      username: 'testuser',
      display_name: 'Test User',
      bio: 'Test bio',
      avatar_url: 'https://example.com/avatar.jpg',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    render(<UserProfile user={mockUser} />);

    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('Test bio')).toBeInTheDocument();
  });

  it('shows edit button when editable', () => {
    const mockUser = {
      /* ... */
    };
    render(<UserProfile user={mockUser} editable={true} />);

    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
  });
});
```

### 8.2 Hook テスト

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useUser } from './useUser';

describe('useUser', () => {
  it('fetches user data', async () => {
    const { result } = renderHook(() => useUser(1));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBeDefined();
    expect(result.current.user?.id).toBe(1);
  });

  it('handles errors', async () => {
    // Mock API error
    const { result } = renderHook(() => useUser(999));

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });
  });
});
```

---

## 9. CI/CD Pipeline 実装

### 9.1 GitHub Actions 設定

**ファイル**: `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [develop, main]
  pull_request:
    branches: [develop, main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test -- --coverage
      - uses: codecov/codecov-action@v3

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build

  code-review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: AI Code Review
        # Custom action or GitHub Copilot integration
        run: echo "AI code review will run here"
```

### 9.2 GitHub Copilot Integration

**ファイル**: `.github/copilot-instructions.md`

```markdown
# GitHub Copilot Instructions for FUJU Frontend

## Language

- 日本語で応答してください
- コード内のコメント・変数名は英語で統一

## On Code Generation

- TypeScript + React の型安全性を厳密に
- コンポーネントは FC<Props> で型定義
- カスタムフックでロジック分離
- エラーハンドリング必須

## On Code Review (PR)

- TypeScript 型の正確性
- テストカバレッジ（80%+）
- バックエンド API との整合性
- React ベストプラクティス
```

---

## 10. 外部 REST API 統合

### 10.1 API クライアント設計

```typescript
// src/utils/apiClient.ts
interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async request<T>(endpoint: string, options: RequestOptions): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      credentials: 'include', // Session cookie
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const error = (await response.json()) as ApiError;
      throw new ApiError(error.code, error.message, response.status);
    }

    return response.json();
  }

  get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  post<T>(endpoint: string, body: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body });
  }

  put<T>(endpoint: string, body: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body });
  }

  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiClient = new ApiClient(import.meta.env.VITE_API_URL);
```

### 10.2 Hook ベースの API 統合

```typescript
// src/hooks/usePosts.ts
export const usePosts = (initialLimit = 20) => {
  const [posts, setPosts] = React.useState<Post[]>([]);
  const [total, setTotal] = React.useState(0);
  const [offset, setOffset] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchPosts = React.useCallback(
    async (newOffset: number) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.get<ApiResponse<Post[]>>(
          `/posts?limit=${initialLimit}&offset=${newOffset}`,
        );
        if (newOffset === 0) {
          setPosts(response.data);
        } else {
          setPosts((prev) => [...prev, ...response.data]);
        }
        setTotal(response.meta.total);
        setOffset(newOffset);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    },
    [initialLimit],
  );

  React.useEffect(() => {
    fetchPosts(0);
  }, [fetchPosts]);

  const loadMore = React.useCallback(() => {
    fetchPosts(offset + initialLimit);
  }, [offset, initialLimit, fetchPosts]);

  return { posts, total, isLoading, error, loadMore };
};
```

---

## 11. 実装チェックリスト

### Phase 1 確認項目

- [ ] Vite プロジェクト初期化完了
- [ ] TypeScript strict mode 設定
- [ ] ESLint + Prettier 設定
- [ ] Environment variables 設定
- [ ] API クライアント実装
- [ ] 認証フロー実装
- [ ] AuthProvider, useAuth hook
- [ ] 基本ルーティング

### Phase 2-5 確認項目

- [ ] 全コンポーネント実装
- [ ] 全 Hook 実装
- [ ] エラーハンドリング実装
- [ ] CSS スタイリング
- [ ] レスポンシブデザイン確認

### Phase 6-7 確認項目

- [ ] ユニットテスト (80%+)
- [ ] GitHub Actions 設定
- [ ] Lint/Build/Test 自動化
- [ ] AI Code Review 統合
- [ ] Deploy パイプライン準備

---

## 12. バックエンド API との整合性

### 12.1 確認チェックリスト

- [ ] swagger.yaml エンドポイント理解
- [ ] リクエスト / レスポンス型定義
- [ ] Error response フォーマット対応
- [ ] Authentication flow（セッションクッキー）
- [ ] ページネーション仕様統一
- [ ] CSV 変換（スネークケース）

### 12.2 API 仕様リファレンス

**ベース URL**: `http://localhost:8080/v1` (dev)

| エンドポイント                                  | 説明                           |
| ----------------------------------------------- | ------------------------------ |
| `POST /auth/oauth/authorize`                    | OAuth2 認可 URL 生成           |
| `POST /auth/oauth/callback`                     | OAuth2 コールバック            |
| `POST /auth/logout`                             | ログアウト                     |
| `GET /users`                                    | ユーザーリスト                 |
| `POST /users`                                   | ユーザー作成                   |
| `GET /users/{id}`                               | ユーザー詳細                   |
| `PUT /users/{id}`                               | プロフィール更新               |
| `GET /posts`                                    | 投稿リスト（ページネーション） |
| `POST /posts`                                   | 投稿作成                       |
| `GET /posts/{id}`                               | 投稿詳細                       |
| `DELETE /posts/{id}`                            | 投稿削除                       |
| `POST /posts/{id}/comments`                     | コメント追加                   |
| `DELETE /posts/{post_id}/comments/{comment_id}` | コメント削除                   |

---

## 13. キャッシング戦略

### 13.1 フロントエンドキャッシュ設計

**基本方針**: API レスポンスのキャッシュにより、ユーザー体験向上・通信量削減

#### キャッシュ対象エンドポイント

| エンドポイント       | TTL            | キャッシュ戦略          | 理由                     |
| -------------------- | -------------- | ----------------------- | ------------------------ |
| `GET /users/{id}`    | 1 時間         | Time-based              | ユーザー情報は変更頻度低 |
| `GET /users`         | 30 分          | Time-based              | ユーザーリストは頻度低   |
| `GET /posts`         | キャッシュなし | Invalidate              | 常に最新の投稿を表示     |
| `GET /posts/{id}`    | 5 分           | Time-based + URL 変更時 | コメント追加時に無効化   |
| `POST /posts`        | -              | 自動無効化              | 作成後は投稿リスト無効化 |
| `DELETE /posts/{id}` | -              | 自動無効化              | リスト・詳細無効化       |

### 13.2 実装パターン例

```typescript
// キャッシュ用 Hook
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const cache = new Map<string, CacheEntry<any>>();

const useCachedData = <T>(
  endpoint: string,
  ttl: number = 5 * 60 * 1000, // 5 minutes default
): UseDataReturn<T> => {
  const [data, setData] = React.useState<T | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchData = React.useCallback(
    async (skipCache = false) => {
      // キャッシュ確認
      if (!skipCache && cache.has(endpoint)) {
        const entry = cache.get(endpoint)!;
        if (Date.now() - entry.timestamp < entry.ttl) {
          setData(entry.data);
          setIsLoading(false);
          return;
        }
      }

      // API 呼び出し
      try {
        setIsLoading(true);
        const response = await apiClient.get<T>(endpoint);
        cache.set(endpoint, {
          data: response,
          timestamp: Date.now(),
          ttl,
        });
        setData(response);
      } catch (err) {
        setError(ErrorHandler.handle(err).message);
      } finally {
        setIsLoading(false);
      }
    },
    [endpoint, ttl],
  );

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = () => fetchData(true); // キャッシュスキップ

  return { data, isLoading, error, refetch };
};

// 変更操作時のキャッシュ無効化
const useDeletePost = () => {
  const deletePost = async (postId: number) => {
    await apiClient.delete(`/posts/${postId}`);

    // 投稿リストと詳細キャッシュを無効化
    cache.delete('/posts');
    cache.delete(`/posts/${postId}`);
  };

  return { deletePost };
};
```

### 13.3 ブラウザ API キャッシュ（将来実装）

- **Service Worker**: オフラインサポート用
- **LocalStorage**: 一時データ保存
- **IndexedDB**: 大規模データキャッシュ

---

## 14. 非機能要件の詳細

### 14.1 パフォーマンス要件

#### 読込時間目標

| メトリック                     | 目標値   | 測定方法                 |
| ------------------------------ | -------- | ------------------------ |
| First Contentful Paint (FCP)   | < 1.5 秒 | Lighthouse / WebPageTest |
| Largest Contentful Paint (LCP) | < 2.5 秒 | Web Vitals               |
| Cumulative Layout Shift (CLS)  | < 0.1    | Web Vitals               |
| Time to Interactive (TTI)      | < 3.5 秒 | Lighthouse               |

#### バンドルサイズ目標

| コンポーネント   | 目標サイズ       | 方法                          |
| ---------------- | ---------------- | ----------------------------- |
| 初期 JS バンドル | < 150 KB (gzip)  | Code splitting + Lazy loading |
| CSS              | < 30 KB (gzip)   | CSS Modules + Purge CSS       |
| 画像             | < 500 KB (total) | Image optimization + WebP     |

#### 実装施策

```typescript
// Code Splitting 例
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Profile = React.lazy(() => import('./pages/Profile'));

// 遅延ロード + Suspense
<Suspense fallback={<Loading />}>
  <Dashboard />
</Suspense>

// 画像遅延ロード
<img
  src={postImage.url}
  loading="lazy"
  decoding="async"
  alt={postImage.alt}
/>
```

### 14.2 ユーザビリティ要件

#### アクセシビリティ (WCAG 2.1 AA 準拠)

- [ ] キーボード操作対応（Tab キー）
- [ ] スクリーンリーダー対応 (aria-label など)
- [ ] コントラスト比 4.5:1 以上（通常テキスト）
- [ ] フォーカスインジケータ表示
- [ ] フォーム検証エラー明示

#### レスポンシブデザイン

| デバイス     | 解像度 | テスト対象              |
| ------------ | ------ | ----------------------- |
| モバイル     | 320px  | iPhone SE, 古い Android |
| タブレット   | 768px  | iPad, Android tablet    |
| デスクトップ | 1920px | 標準モニター            |

#### 参考実装

```typescript
// Semantic HTML + ARIA
<button
  aria-label="ツイート"
  aria-pressed={isLiked}
  onClick={handleLike}
>
  <HeartIcon />
</button>

// フォーカス可視化
button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

// コントラスト確保
color: var(--color-text-primary); /* 7:1 ratio */
background: var(--color-bg-primary); /* 4.5:1 minimum */
```

### 14.3 セキュリティ要件

#### CSRF 対策

- [ ] リクエストヘッダに CSRF トークンを含める
- [ ] POST/PUT/DELETE 時にトークン検証

#### XSS 対策

- [ ] ユーザー入力は常に Escape/Sanitize
- [ ] DOMPurify ライブラリ使用（HTML コンテンツ表示時）
- [ ] Content Security Policy (CSP) ヘッダ設定

#### 安全な通信

- [ ] HTTPS のみ（HTTP 非対応）
- [ ] HttpOnly + Secure + SameSite=Strict Cookie 設定
- [ ] CORS ポリシー厳密設定

#### ユーザーデータ保護

- [ ] LocalStorage にセンシティブデータ非保存
- [ ] セッション有効期限切れ時は自動ログアウト
- [ ] 認証失敗時は詳細エラーメッセージ非表示

### 14.4 信頼性・可用性要件

#### エラー回復機能

```typescript
// 自動リトライ（3 回まで、指数バックオフ）
const withRetry = async <T>(fn: () => Promise<T>, maxRetries = 3, delay = 1000): Promise<T> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
  throw new Error('Retry exhausted');
};
```

#### 稼働率目標

- **目標 SLA**: 99.5% 月間稼働率
- **許容ダウンタイム**: 月 3.6 時間
- **復旧時間**: RTO ≤ 15 分、RPO ≤ 5 分

### 14.5 保守性要件

#### コード品質

- [ ] TypeScript 厳格モード（noImplicitAny, strict: true）
- [ ] ESLint + Prettier 自動チェック
- [ ] 品質スコア: SonarQube A 以上

#### テストカバレッジ

- [ ] ユニットテスト: 80% 以上
- [ ] 統合テスト: 60% 以上
- [ ] E2E テスト: 主要フロー 100%

#### ドキュメント

- [ ] JSDoc コメント必須
- [ ] README.md で環境構築手順記載
- [ ] API インテグレーション仕様書管理

---

## 15. Service Worker とオフラインモード

### 15.1 Service Worker の役割

**目的**: ネットワーク断時にキャッシュされたコンテンツを提供、ユーザー操作を一時保存

### 15.2 実装パターン

#### Service Worker 登録

```typescript
// src/utils/serviceWorkerRegister.ts
export const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Workers not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    console.log('Service Worker registered:', registration);

    // Listen for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'activated') {
            // New version available
            console.log('New version available, please refresh');
          }
        });
      }
    });
  } catch (err) {
    console.error('Service Worker registration failed:', err);
  }
};

// src/main.tsx
if (import.meta.env.PROD) {
  registerServiceWorker();
}
```

#### Service Worker ファイル (public/sw.js)

```javascript
const CACHE_NAME = 'fuju-v1';
const OFFLINE_URL = '/offline.html';

// Install: キャッシュ準備
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['/', '/offline.html', '/index.html', '/css/styles.css']);
    }),
  );
  self.skipWaiting(); // 即座にアクティベート
});

// Activate: 古いキャッシュ削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)),
      );
    }),
  );
  self.clients.claim();
});

// Fetch: ネットワーク優先、失敗時キャッシュ
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // レスポンスをキャッシュ
        const cloned = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, cloned);
        });
        return response;
      })
      .catch(() => {
        // ネットワーク失敗時: キャッシュから取得
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // キャッシュもない場合: offline.html を返す
          return caches.match(OFFLINE_URL);
        });
      }),
  );
});
```

### 15.3 オフラインモード UI

#### オフライン検出 Hook

```typescript
// src/hooks/useOnlineStatus.ts
const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};
```

#### オフラインバナーコンポーネント

```typescript
// src/components/OfflineBanner.tsx
const OfflineBanner: FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="offline-banner" role="alert">
      <div className="offline-banner-icon">📶</div>
      <div className="offline-banner-content">
        <h3>オフラインモード</h3>
        <p>キャッシュされたデータのみ表示されます。ネットワークに接続してください。</p>
      </div>
    </div>
  );
};
```

#### CSS

```css
.offline-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background-color: var(--color-warning);
  color: var(--color-text-on-warning);
  padding: var(--spacing-md);
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  z-index: 1000;
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    transform: translateY(-100%);
  }
  to {
    transform: translateY(0);
  }
}
```

### 15.4 操作キューイング（オフライン時の保存）

```typescript
// src/services/offlineQueue.ts
interface QueuedAction {
  id: string;
  type: 'CREATE_POST' | 'DELETE_POST' | 'ADD_COMMENT';
  payload: Record<string, any>;
  timestamp: number;
  retries: number;
}

class OfflineQueue {
  private queue: QueuedAction[] = [];
  private storageKey = 'offline-queue';

  constructor() {
    // LocalStorage から復元
    const stored = localStorage.getItem(this.storageKey);
    if (stored) {
      this.queue = JSON.parse(stored);
    }
  }

  add(action: Omit<QueuedAction, 'id' | 'timestamp' | 'retries'>) {
    const queued: QueuedAction = {
      ...action,
      id: `${action.type}-${Date.now()}`,
      timestamp: Date.now(),
      retries: 0,
    };
    this.queue.push(queued);
    this.persist();
    console.log(`[Offline Queue] Added: ${queued.id}`);
  }

  async sync() {
    if (!navigator.onLine) return;

    const failed: QueuedAction[] = [];

    for (const action of this.queue) {
      try {
        await this.executeAction(action);
        console.log(`[Offline Queue] Synced: ${action.id}`);
      } catch (err) {
        action.retries++;
        if (action.retries < 3) {
          failed.push(action);
        }
      }
    }

    this.queue = failed;
    this.persist();
  }

  private async executeAction(action: QueuedAction) {
    switch (action.type) {
      case 'CREATE_POST':
        return apiClient.post('/posts', action.payload);
      case 'DELETE_POST':
        return apiClient.delete(`/posts/${action.payload.postId}`);
      case 'ADD_COMMENT':
        return apiClient.post(`/posts/${action.payload.postId}/comments`, action.payload.comment);
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  private persist() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.queue));
  }
}

export const offlineQueue = new OfflineQueue();

// 接続復帰時に自動 sync
window.addEventListener('online', () => {
  offlineQueue.sync();
});
```

#### Hook で使用

```typescript
// src/hooks/useCreatePost.ts
const useCreatePost = () => {
  const createPost = async (content: string, images: string[]) => {
    const isOnline = navigator.onLine;

    if (!isOnline) {
      // オフライン時: キューに保存
      offlineQueue.add({
        type: 'CREATE_POST',
        payload: { content, image_urls: images },
      });
      return { id: `temp-${Date.now()}`, content, image_urls: images };
    }

    // オンライン時: 通常の API 呼び出し
    return apiClient.post('/posts', { content, image_urls: images });
  };

  return { createPost };
};
```

---

## 16. 動的 Favicon による通知表示

### 16.1 目的

ブラウザタブのアイコン（Favicon）を動的に生成し、未読通知の数を視覚的に表示

### 16.2 実装パターン

#### Canvas を使った Favicon 生成

```typescript
// src/utils/faviconGenerator.ts
interface FaviconOptions {
  count: number;
  hasNotification: boolean;
  size?: number;
}

export class FaviconGenerator {
  private static defaultSize = 32;
  private static defaultColor = '#ff6b6b'; // 赤

  /**
   * Canvas で動的に Favicon を生成
   */
  static generate(options: FaviconOptions): string {
    const { count, hasNotification, size = this.defaultSize } = options;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d')!;

    // 背景（デフォルト Favicon または白背景）
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    // 通知がある場合: 赤いバッジ
    if (hasNotification && count > 0) {
      // バッジ背景（右下バージョン）
      const badgeSize = Math.ceil(size * 0.4);
      const badgeX = size - badgeSize;
      const badgeY = size - badgeSize;

      ctx.fillStyle = this.defaultColor;
      ctx.beginPath();
      ctx.arc(badgeX + badgeSize / 2, badgeY + badgeSize / 2, badgeSize / 2, 0, 2 * Math.PI);
      ctx.fill();

      // バッジ内の数字
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${Math.ceil(badgeSize * 0.6)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const displayCount = count > 99 ? '99+' : String(count);
      ctx.fillText(displayCount, badgeX + badgeSize / 2, badgeY + badgeSize / 2);
    }

    // Canvas を Data URL に変換
    return canvas.toDataURL('image/png');
  }

  /**
   * Favicon を DOM に適用
   */
  static apply(dataUrl: string) {
    let link = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;

    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/png';
      document.head.appendChild(link);
    }

    link.href = dataUrl;
  }
}
```

#### 実装例（Hook での使用）

```typescript
// src/hooks/useNotificationBadge.ts
interface NotificationState {
  unreadCount: number;
  hasNotification: boolean;
}

const useNotificationBadge = () => {
  const [notificationState, setNotificationState] = React.useState<NotificationState>({
    unreadCount: 0,
    hasNotification: false,
  });

  // 通知状態を取得
  React.useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await apiClient.get('/notifications');
        const unreadCount = response.data.filter((n: any) => !n.read).length;
        setNotificationState({
          unreadCount,
          hasNotification: unreadCount > 0,
        });
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      }
    };

    fetchNotifications();

    // 定期的に更新（30 秒ごと）
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Favicon を更新
  React.useEffect(() => {
    const faviconUrl = FaviconGenerator.generate({
      count: notificationState.unreadCount,
      hasNotification: notificationState.hasNotification,
    });
    FaviconGenerator.apply(faviconUrl);
  }, [notificationState]);

  return notificationState;
};
```

#### App での使用

```typescript
// src/App.tsx
const App: FC = () => {
  const { unreadCount } = useNotificationBadge();

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        {/* ... */}
      </Routes>
      {unreadCount > 0 && <NotificationIndicator count={unreadCount} />}
    </Layout>
  );
};
```

### 16.3 ブラウザ互換性

| ブラウザ    | Canvas Favicon | Service Worker | オフライン対応 |
| ----------- | -------------- | -------------- | -------------- |
| Chrome 90+  | ✅             | ✅             | ✅             |
| Firefox 88+ | ✅             | ✅             | ✅             |
| Safari 15+  | ✅             | ✅             | ✅             |
| Edge 90+    | ✅             | ✅             | ✅             |

### 16.4 パフォーマンス最適化

```typescript
// Favicon 更新を debounce（連続更新を防ぐ）
const useNotificationBadgeOptimized = () => {
  const [state, setState] = React.useState<NotificationState>({
    unreadCount: 0,
    hasNotification: false,
  });
  const timeoutRef = React.useRef<NodeJS.Timeout>();

  const updateState = React.useCallback((newState: NotificationState) => {
    // 前回の更新をキャンセル
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // 300ms 後に Favicon を更新
    timeoutRef.current = setTimeout(() => {
      setState(newState);
      const faviconUrl = FaviconGenerator.generate(newState);
      FaviconGenerator.apply(faviconUrl);
    }, 300);
  }, []);

  return { updateState, state };
};
```

---

**キャッシング・非機能要件・オフライン対応**: ✅ 確定版  
**実装予定フェーズ**: フェーズ 2-4 で段階的実装
