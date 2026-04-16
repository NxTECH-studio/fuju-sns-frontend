/**
 * エラーハンドリング実装
 * API エラー、アプリケーションエラーの統一的な処理
 */

import type { ApiErrorResponse } from '../types';

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly timestamp?: string;

  constructor(status: number, code: string, message: string, timestamp?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.timestamp = timestamp;
  }
}

export class ErrorHandler {
  /**
   * API レスポンスを解析してエラーに変換
   */
  static async fromResponse(response: Response): Promise<ApiError> {
    try {
      const data: ApiErrorResponse = await response.json();
      return new ApiError(response.status, data.code, data.message, data.timestamp);
    } catch {
      return new ApiError(
        response.status,
        'UNKNOWN_ERROR',
        `HTTPエラー: ${response.status}`,
        new Date().toISOString(),
      );
    }
  }

  /**
   * エラーを標準化されたメッセージに変換
   */
  static handle(error: unknown): { message: string; code: string } {
    if (error instanceof ApiError) {
      const message = this.getMessageForErrorCode(error.code);
      return { message, code: error.code };
    }

    if (error instanceof Error) {
      return { message: error.message, code: 'APP_ERROR' };
    }

    return { message: '予期しないエラーが発生しました', code: 'UNKNOWN_ERROR' };
  }

  /**
   * エラーコードに対応する日本語メッセージを取得
   */
  static getMessageForErrorCode(code: string): string {
    const messages: Record<string, string> = {
      INVALID_REQUEST: 'リクエストが不正です。入力内容を確認してください。',
      UNAUTHORIZED: 'ログインが必要です。',
      FORBIDDEN: 'この操作は許可されていません。',
      NOT_FOUND: 'リソースが見つかりません。',
      CONFLICT: 'この操作は実行できません（競合が発生しました）。',
      SERVER_ERROR: 'サーバーエラーが発生しました。しばらく後に再試行してください。',
      UNKNOWN_ERROR: '予期しないエラーが発生しました。',
    };

    return messages[code] || `エラーが発生しました（${code}）`;
  }

  /**
   * 認証エラーの判定
   */
  static isAuthError(error: unknown): boolean {
    return error instanceof ApiError && (error.status === 401 || error.code === 'UNAUTHORIZED');
  }

  /**
   * 権限エラーの判定
   */
  static isForbiddenError(error: unknown): boolean {
    return error instanceof ApiError && (error.status === 403 || error.code === 'FORBIDDEN');
  }
}
