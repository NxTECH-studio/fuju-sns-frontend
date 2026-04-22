import type { ReactNode } from "react";
import { EmptyState } from "./EmptyState";
import { ErrorMessage } from "./ErrorMessage";

interface AsyncViewProps {
  loading: boolean;
  error: string | null;
  isEmpty?: boolean;
  emptyFallback?: ReactNode;
  loadingFallback?: ReactNode;
  children: ReactNode;
}

// Resolves the loading / error / empty / content cascade that otherwise
// appears as a nested ternary in every data-driven route.
//
// Not an error boundary: render errors from children bubble up. Async
// errors surface via the `error` prop.
export function AsyncView({
  loading,
  error,
  isEmpty,
  emptyFallback,
  loadingFallback,
  children,
}: AsyncViewProps) {
  if (loading) {
    return <>{loadingFallback ?? <EmptyState title="読み込み中..." />}</>;
  }
  if (error) return <ErrorMessage message={error} />;
  if (isEmpty && emptyFallback !== undefined) return <>{emptyFallback}</>;
  return <>{children}</>;
}
