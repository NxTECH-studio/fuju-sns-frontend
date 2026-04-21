export class FujuApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly timestamp: string | undefined;

  constructor(status: number, code: string, message: string, timestamp?: string) {
    super(message);
    this.name = 'FujuApiError';
    this.status = status;
    this.code = code;
    this.timestamp = timestamp;
  }
}

export function isFujuApiError(e: unknown): e is FujuApiError {
  return e instanceof FujuApiError;
}

export function isAbortError(e: unknown): boolean {
  return e instanceof DOMException && e.name === 'AbortError';
}
