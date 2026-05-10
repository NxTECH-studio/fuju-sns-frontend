import type { AuthError } from './types';

export function isAuthError(e: unknown): e is AuthError {
  return (
    e instanceof Error &&
    typeof (e as { code?: unknown }).code === 'string' &&
    typeof (e as { status?: unknown }).status === 'number'
  );
}

export function createAuthError(
  message: string,
  code: string,
  status: number,
  retryAfterSec?: number,
): AuthError {
  const err = new Error(message) as Error & {
    code: string;
    status: number;
    retryAfterSec?: number;
  };
  err.code = code;
  err.status = status;
  if (retryAfterSec !== undefined) err.retryAfterSec = retryAfterSec;
  return err as AuthError;
}
