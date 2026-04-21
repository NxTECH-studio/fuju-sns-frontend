import type { ReactNode } from "react";
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
export function AsyncView({
  loading,
  error,
  isEmpty,
  emptyFallback,
  loadingFallback,
  children,
}: AsyncViewProps) {
  if (loading) return <>{loadingFallback ?? <p>読み込み中...</p>}</>;
  if (error) return <ErrorMessage message={error} />;
  if (isEmpty && emptyFallback !== undefined) return <>{emptyFallback}</>;
  return <>{children}</>;
}
