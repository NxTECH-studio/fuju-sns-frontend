/**
 * ErrorHandler Utility Tests
 */

import { describe, it, expect } from 'vitest';
import { ErrorHandler, ApiError } from '../errorHandler';

describe('ApiError', () => {
  it('should create error with message', () => {
    const error = new ApiError('Test error', 400);
    expect(error.message).toBe('Test error');
    expect(error.status).toBe(400);
  });

  it('should create error with data', () => {
    const errorData = { field: 'email', message: 'Invalid email' };
    const error = new ApiError('Validation error', 422, errorData);
    expect(error.data).toEqual(errorData);
  });

  it('should extend Error class', () => {
    const error = new ApiError('Test error', 400);
    expect(error instanceof Error).toBe(true);
  });
});

describe('ErrorHandler.handle', () => {
  it('should handle ApiError', () => {
    const apiError = new ApiError('Unauthorized', 401);
    const { status, message, isApiError } = ErrorHandler.handle(apiError);

    expect(status).toBe(401);
    expect(isApiError).toBe(true);
    expect(message).toBeTruthy();
  });

  it('should handle 401 Unauthorized error', () => {
    const apiError = new ApiError('Unauthorized', 401);
    const { message } = ErrorHandler.handle(apiError);

    expect(message).toContain('ログイン') || expect(message).toContain('認証');
  });

  it('should handle 403 Forbidden error', () => {
    const apiError = new ApiError('Forbidden', 403);
    const { message } = ErrorHandler.handle(apiError);

    expect(message).toBeTruthy();
  });

  it('should handle 404 Not Found error', () => {
    const apiError = new ApiError('Not Found', 404);
    const { message } = ErrorHandler.handle(apiError);

    expect(message).toContain('見つかりません') || expect(message).toBeTruthy();
  });

  it('should handle 500 Server error', () => {
    const apiError = new ApiError('Internal Server Error', 500);
    const { message } = ErrorHandler.handle(apiError);

    expect(message).toContain('サーバー') || expect(message).toBeTruthy();
  });

  it('should handle generic Error', () => {
    const error = new Error('Generic error message');
    const { isApiError, message } = ErrorHandler.handle(error);

    expect(isApiError).toBe(false);
    expect(message).toBe('Generic error message');
  });

  it('should handle string error', () => {
    const { isApiError, message } = ErrorHandler.handle('String error');

    expect(isApiError).toBe(false);
    expect(message).toBe('String error');
  });

  it('should handle unknown error types', () => {
    const { message } = ErrorHandler.handle({ randomProperty: 'value' });

    expect(message).toBeTruthy();
  });

  it('should include status code in result', () => {
    const apiError = new ApiError('Bad Request', 400);
    const { status } = ErrorHandler.handle(apiError);

    expect(status).toBe(400);
  });

  it('should include isApiError flag', () => {
    const apiError = new ApiError('Test', 400);
    const error = new Error('Test');

    expect(ErrorHandler.handle(apiError).isApiError).toBe(true);
    expect(ErrorHandler.handle(error).isApiError).toBe(false);
  });
});
