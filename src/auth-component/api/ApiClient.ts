import { ErrorCodes } from '../ErrorCodes';
import { createAuthError } from '../isAuthError';
import type { AuthError } from '../types';

export interface ApiRequestInit extends Omit<RequestInit, 'body'> {
  body?: BodyInit | null;
  json?: unknown;
}

export type GetAccessToken = () => string | null;
export type OnUnauthorized = () => Promise<boolean>;
export type OnUnauthorizedSignal = (path: string) => void;

export class ApiClient {
  private readonly baseURL: string;
  private readonly getAccessToken: GetAccessToken;
  private readonly onUnauthorized: OnUnauthorized;
  private readonly fetchImpl: typeof fetch;
  private readonly onUnauthorizedSignal: OnUnauthorizedSignal | undefined;

  constructor(
    baseURL: string,
    getAccessToken: GetAccessToken,
    onUnauthorized: OnUnauthorized,
    fetchImpl: typeof fetch = fetch,
    onUnauthorizedSignal?: OnUnauthorizedSignal,
  ) {
    this.baseURL = baseURL.replaceAll(/\/+$/g, '');
    this.getAccessToken = getAccessToken;
    this.onUnauthorized = onUnauthorized;
    this.fetchImpl = fetchImpl;
    this.onUnauthorizedSignal = onUnauthorizedSignal;
  }

  async request<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
    const isRefresh = path === '/v1/auth/refresh';
    const { json, body: initBody, headers: initHeaders, ...rest } = init;

    const doFetch = async (): Promise<Response> => {
      const headers = new Headers(initHeaders);
      if (!headers.has('Accept')) headers.set('Accept', 'application/json');

      const token = this.getAccessToken();
      if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      let body: BodyInit | null | undefined = initBody;
      if (json !== undefined) {
        headers.set('Content-Type', 'application/json; charset=utf-8');
        body = JSON.stringify(json);
      }

      try {
        return await this.fetchImpl(this.baseURL + path, {
          ...rest,
          headers,
          body: body ?? null,
          credentials: 'include',
        });
      } catch (e) {
        throw createAuthError(
          e instanceof Error ? e.message : 'network error',
          ErrorCodes.NETWORK_ERROR,
          0,
        );
      }
    };

    let res = await doFetch();
    if (res.status === 401 && !isRefresh) {
      this.onUnauthorizedSignal?.(path);
      const refreshed = await this.onUnauthorized();
      if (refreshed) {
        res = await doFetch();
      }
    }

    if (!res.ok) {
      throw await parseError(res);
    }

    if (res.status === 204) return undefined as T;
    const ct = res.headers.get('content-type') ?? '';
    if (ct.includes('application/json')) {
      return (await res.json()) as T;
    }
    return undefined as T;
  }
}

export async function parseError(res: Response): Promise<AuthError> {
  let code = ErrorCodes.NETWORK_ERROR as string;
  let message = res.statusText || 'request failed';
  try {
    const body = (await res.json()) as { error?: string; message?: string };
    if (body.error) code = body.error;
    if (body.message) message = body.message;
  } catch {
    /* ignore */
  }
  if (code === ErrorCodes.NETWORK_ERROR && res.status > 0) {
    code = `HTTP_${res.status}`;
  }
  const retryAfterSec = parseRetryAfter(res.headers.get('retry-after'));
  return createAuthError(message, code, res.status, retryAfterSec);
}

export function parseRetryAfter(v: string | null): number | undefined {
  if (!v) return undefined;
  const sec = Number(v);
  if (!Number.isNaN(sec)) return Math.max(0, sec);
  const t = Date.parse(v);
  if (!Number.isNaN(t)) return Math.max(0, Math.ceil((t - Date.now()) / 1000));
  return undefined;
}
