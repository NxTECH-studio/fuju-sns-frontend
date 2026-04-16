/**
 * 定数・環境変数管理
 */

// ========== API 設定 ==========
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const API_TIMEOUT_MS = 30000; // 30 seconds

export const OAUTH_CLIENT_ID = import.meta.env.VITE_OAUTH_CLIENT_ID || '';

export const OAUTH_REDIRECT_URI =
  import.meta.env.VITE_OAUTH_REDIRECT_URI || 'http://localhost:5173/auth/callback';

export const ENVIRONMENT = import.meta.env.VITE_ENVIRONMENT || 'development';

export const IS_DEVELOPMENT = ENVIRONMENT === 'development';
export const IS_PRODUCTION = ENVIRONMENT === 'production';

// ========== ページネーション設定 ==========
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// ========== バリデーション設定 ==========
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 50;

export const DISPLAY_NAME_MAX_LENGTH = 100;

export const BIO_MAX_LENGTH = 500;

export const POST_CONTENT_MIN_LENGTH = 1;
export const POST_CONTENT_MAX_LENGTH = 5000;
export const POST_MAX_IMAGES = 10;

export const COMMENT_CONTENT_MIN_LENGTH = 1;
export const COMMENT_CONTENT_MAX_LENGTH = 1000;

// ========== OAuth プロバイダー ==========
export const OAUTH_PROVIDERS = {
  GOOGLE: 'google',
  GITHUB: 'github',
} as const;

// ========== URL パス ==========
export const PATHS = {
  LOGIN: '/login',
  AUTH_CALLBACK: '/auth/callback',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  USER: '/user',
  POST: '/post',
  NOT_FOUND: '/404',
  ERROR: '/error',
} as const;

// ========== ストレージキー ==========
export const STORAGE_KEYS = {
  USER: 'fuju_user',
  AUTH_STATE: 'fuju_auth_state',
} as const;
