import { FujuApiError } from "./error";
import type { ApiErrorPayload } from "./types";

export type GetToken = () => string | null;

export interface FujuClientOptions {
  baseURL: string;
  getToken: GetToken;
  fetchImpl?: typeof fetch;
}

export interface RequestOpts {
  signal?: AbortSignal;
  query?: Record<string, string | number | boolean | null | undefined>;
}

export interface FujuClient {
  get<T>(path: string, opts?: RequestOpts): Promise<T>;
  post<T>(path: string, body?: unknown, opts?: RequestOpts): Promise<T>;
  put<T>(path: string, body?: unknown, opts?: RequestOpts): Promise<T>;
  del<T = void>(path: string, opts?: RequestOpts): Promise<T>;
  postForm<T>(path: string, form: FormData, opts?: RequestOpts): Promise<T>;
}

export function createFujuClient(opts: FujuClientOptions): FujuClient {
  const baseURL = opts.baseURL.replace(/\/+$/, "");
  const fetchImpl = opts.fetchImpl ?? fetch.bind(globalThis);

  const buildURL = (path: string, query?: RequestOpts["query"]): string => {
    const normalized = path.startsWith("/") ? path : `/${path}`;
    if (!query) return baseURL + normalized;
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v === null || v === undefined) continue;
      sp.set(k, String(v));
    }
    const qs = sp.toString();
    return baseURL + normalized + (qs ? `?${qs}` : "");
  };

  const doRequest = async (
    method: string,
    path: string,
    init: {
      body?: BodyInit | null;
      headers?: Record<string, string>;
      signal?: AbortSignal;
      query?: RequestOpts["query"];
    }
  ): Promise<Response> => {
    const headers = new Headers(init.headers);
    if (!headers.has("Accept")) headers.set("Accept", "application/json");
    const token = opts.getToken();
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    return fetchImpl(buildURL(path, init.query), {
      method,
      headers,
      body: init.body ?? null,
      signal: init.signal,
    });
  };

  const parseBody = async <T>(res: Response): Promise<T> => {
    if (res.status === 204) return undefined as T;
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      return (await res.json()) as T;
    }
    return undefined as T;
  };

  const throwIfError = async (res: Response): Promise<void> => {
    if (res.ok) return;
    let payload: Partial<ApiErrorPayload> = {};
    try {
      const ct = res.headers.get("content-type") ?? "";
      if (ct.includes("application/json")) {
        payload = (await res.json()) as Partial<ApiErrorPayload>;
      }
    } catch {
      /* ignore */
    }
    throw new FujuApiError(
      res.status,
      payload.code ?? `HTTP_${res.status}`,
      payload.message ?? res.statusText ?? "request failed",
      payload.timestamp
    );
  };

  const withJson = (
    body: unknown
  ): { body: BodyInit | null; headers: Record<string, string> } => {
    if (body === undefined || body === null) {
      return { body: null, headers: {} };
    }
    return {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json; charset=utf-8" },
    };
  };

  return {
    async get<T>(path: string, o?: RequestOpts): Promise<T> {
      const res = await doRequest("GET", path, {
        signal: o?.signal,
        query: o?.query,
      });
      await throwIfError(res);
      return parseBody<T>(res);
    },
    async post<T>(path: string, body?: unknown, o?: RequestOpts): Promise<T> {
      const j = withJson(body);
      const res = await doRequest("POST", path, {
        body: j.body,
        headers: j.headers,
        signal: o?.signal,
        query: o?.query,
      });
      await throwIfError(res);
      return parseBody<T>(res);
    },
    async put<T>(path: string, body?: unknown, o?: RequestOpts): Promise<T> {
      const j = withJson(body);
      const res = await doRequest("PUT", path, {
        body: j.body,
        headers: j.headers,
        signal: o?.signal,
        query: o?.query,
      });
      await throwIfError(res);
      return parseBody<T>(res);
    },
    async del<T = void>(path: string, o?: RequestOpts): Promise<T> {
      const res = await doRequest("DELETE", path, {
        signal: o?.signal,
        query: o?.query,
      });
      await throwIfError(res);
      return parseBody<T>(res);
    },
    async postForm<T>(
      path: string,
      form: FormData,
      o?: RequestOpts
    ): Promise<T> {
      const res = await doRequest("POST", path, {
        body: form,
        signal: o?.signal,
        query: o?.query,
      });
      await throwIfError(res);
      return parseBody<T>(res);
    },
  };
}
