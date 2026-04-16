/**
 * API クライアント実装
 * fetch API ラッパー、統一的な API 通信管理
 */

import { ErrorHandler } from './errorHandler';
import { API_BASE_URL, API_TIMEOUT_MS } from './constants';

export interface ApiClientOptions {
  baseUrl?: string;
  timeout?: number;
}

export class ApiClient {
  private baseUrl: string;
  private timeout: number;

  constructor(options?: ApiClientOptions) {
    this.baseUrl = options?.baseUrl || API_BASE_URL;
    this.timeout = options?.timeout || API_TIMEOUT_MS;
  }

  /**
   * GET リクエスト
   */
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>('GET', endpoint);
  }

  /**
   * POST リクエスト
   */
  async post<T>(endpoint: string, body: unknown): Promise<T> {
    return this.request<T>('POST', endpoint, body);
  }

  /**
   * PUT リクエスト
   */
  async put<T>(endpoint: string, body: unknown): Promise<T> {
    return this.request<T>('PUT', endpoint, body);
  }

  /**
   * DELETE リクエスト
   */
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>('DELETE', endpoint);
  }

  /**
   * 内部: 汎用リクエスト実装
   */
  private async request<T>(method: string, endpoint: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        credentials: 'include', // Session cookie
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw await ErrorHandler.fromResponse(response);
      }

      // ステータスコード 204 No Content の処理
      if (response.status === 204) {
        return {} as T;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`リクエストタイムアウト（${this.timeout}ms）`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

// シングルトンインスタンス
export const apiClient = new ApiClient();
