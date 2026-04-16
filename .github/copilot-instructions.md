# GitHub Copilot Instructions for FUJU Frontend

You are an expert TypeScript/React developer working on the FUJU SNS Frontend project.

## Language & Communication

- **応答言語**: 日本語で応答してください
- **コード言語**: TypeScript + React（英語のコメント・変数名を保持）
- **ドキュメント**: 日本語で簡潔に記載
- **コミットメッセージ**: 英語（Conventional Commits）

## Core Development Guidelines

### TypeScript & React Standards

1. **型安全性**: 厳密に実装
   - ✅ NO implicit `any` types; use strict mode
   - ✅ Use `FC<Props>` for all components
   - ✅ Define interfaces for all props/responses
   - ✅ Auto-resolve types from backend API responses

2. **コンポーネント設計**:
   - ✅ Functional components only
   - ✅ Custom hooks for business logic separation
   - ✅ Max 300 lines per file
   - ✅ Semantic, descriptive component names
   - ✅ React.memo for performance-critical components

3. **エラーハンドリング**:
   - ✅ Try-catch for all async operations
   - ✅ Error Boundary wrapper for top-level components
   - ✅ User-friendly error messages (日本語)
   - ✅ Proper error logging (development)
   - ❌ NO silent error swallowing
   - ❌ NO unhandled promise rejections

4. **テスト**:
   - ✅ Unit tests for all components (React Testing Library)
   - ✅ Hook tests with renderHook
   - ✅ Test error scenarios explicitly
   - ✅ Target: 80%+ code coverage
   - ✅ Use table-driven tests for multiple scenarios

5. **カスタムフック**:
   - ✅ Extract all data-fetching logic into hooks
   - ✅ Return { data, error, isLoading, refetch }
   - ✅ Handle dependency arrays correctly
   - ✅ Implement useCallback for memoized functions

### API Integration

- ✅ Use `apiClient` for all API calls (NO direct fetch)
- ✅ Implement proper error handling (401→logout, 403→forbidden)
- ✅ Set loading & error states explicitly
- ✅ Use `credentials: 'include'` for session cookies
- ✅ Type ALL API responses with interfaces
- ✅ Validate response structure
- ✅ Handle API timeouts gracefully

### Styling & Responsive Design

- ✅ Use CSS Variables (--color-*, --spacing-*, etc.)
- ✅ CSS Modules for component-scoped styles
- ✅ Mobile-first responsive design
- ✅ Semantic HTML for accessibility
- ✅ Test on mobile (320px), tablet (768px), desktop (1920px)
- ❌ NO inline styles (except CSS variable references)
- ❌ NO hardcoded color/spacing values
- ❌ NO !important rules

### Performance Optimization

- ✅ Code splitting with React.lazy
- ✅ Memoization (React.memo, useMemo, useCallback)
- ✅ Infinite scroll for list views
- ✅ Image lazy loading
- ✅ Debounce/throttle for input handlers
- ❌ NO unnecessary re-renders
- ❌ NO missing dependency arrays

## When Writing Code

### Example: Custom Hook for Data Fetching

```typescript
interface UseDataReturn<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export const useData = <T,>(endpoint: string): UseDataReturn<T> => {
  const [data, setData] = React.useState<T | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const refetch = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.get<ApiResponse<T>>(endpoint);
      setData(response.data);
    } catch (err) {
      const { message } = ErrorHandler.handle(err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [endpoint]);

  React.useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, error, isLoading, refetch };
};
```

### Example: Component with Error Handling

```typescript
const UserProfile: FC<{ userId: number }> = ({ userId }) => {
  const { user, error, isLoading, refetch } = useUser(userId);

  if (isLoading) return <Loading />;
  if (error) return <ErrorMessage message={error} onRetry={refetch} />;
  if (!user) return <NotFound />;

  return <UserCard user={user} />;
};
```

### Example: Protected Route

```typescript
const ProtectedRoute: FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <Loading />;
  if (!isAuthenticated) return <Navigate to="/login" />;

  return <>{children}</>;
};
```

## When Reviewing PRs (as Code Reviewer)

Check for:

- [ ] **Type Safety**: NO implicit any, strict types
- [ ] **React Practices**: Proper hooks, memo usage, dependency arrays
- [ ] **Error Handling**: Complete, with user-friendly messages
- [ ] **Tests**: 80%+ coverage, all error scenarios
- [ ] **API Integration**: Matches swagger.yaml spec, proper headers
- [ ] **Security**: XSS prevention, CSRF tokens, no sensitive data in logs
- [ ] **Performance**: Memoization, code splitting, lazy loading
- [ ] **Responsive**: Mobile-first design verified
- [ ] **Accessibility**: Semantic HTML, aria-labels, keyboard navigation
- [ ] **Git Commit**: Conventional format (feat/fix/docs/test/refactor)

## Reference Files to Study

- `.agent.md` - **MUST READ**: Complete AI development guidelines
- `.claude` - Language & context preferences
- `docs/SPECIFICATION.md` - Feature requirements & API specs
- `docs/IMPLEMENTATION.md` - Architecture & design decisions
- `docs/BACKEND_INTEGRATION.md` - Backend API integration
- Backend `.agent.md` - For context on Clean Architecture

## GitHub CLI Usage (MANDATORY)

**IMPORTANT**: Always use GitHub CLI (`gh` command) ONLY:

```bash
# Create Pull Request (with description)
gh pr create \
  --base develop \
  --head feat/my-feature \
  --title "feat(component): Add user profile" \
  --body "## Description\nImplements user profile display.\n\n## Testing\n- Unit tests: 100%\n- Manual: verified on mobile/desktop"

# View PR status
gh pr view
gh pr view <number>

# Add review comment
gh pr review <number> --comment -b "Great implementation! One suggestion: ..."

# Approve & merge
gh pr review <number> --approve
gh pr merge <number> --squash

# Create issue
gh issue create --title "Bug: Login fails on mobile" --body "Steps to reproduce..."

# Verify auth
gh auth status
```

**NEVER use GitLens UI** - CLI only for reproducibility & consistency.

## When Uncertain

Apply these principles in order:

1. **Type Safety**: Choose stricter typing
2. **Readability**: Code is self-documenting without comments
3. **Testability**: Design code to be testable
4. **Performance**: Measure before optimizing
5. **Consistency**: Match existing patterns

Always refer to `.agent.md` and `.claude` for detailed guidance.

---

**Last Updated**: 2026-04-16
