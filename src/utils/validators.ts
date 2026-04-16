/**
 * 入力値バリデーション実装
 */

import {
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  DISPLAY_NAME_MAX_LENGTH,
  BIO_MAX_LENGTH,
  POST_CONTENT_MIN_LENGTH,
  POST_CONTENT_MAX_LENGTH,
  POST_MAX_IMAGES,
  COMMENT_CONTENT_MIN_LENGTH,
  COMMENT_CONTENT_MAX_LENGTH,
} from './constants';

export interface ValidationError {
  field: string;
  message: string;
}

export class Validators {
  /**
   * ユーザー名のバリデーション
   */
  static validateUsername(username: string): ValidationError | null {
    if (!username || username.trim().length === 0) {
      return { field: 'username', message: 'ユーザー名は必須です' };
    }

    if (username.length < USERNAME_MIN_LENGTH) {
      return {
        field: 'username',
        message: `ユーザー名は${USERNAME_MIN_LENGTH}文字以上である必要があります`,
      };
    }

    if (username.length > USERNAME_MAX_LENGTH) {
      return {
        field: 'username',
        message: `ユーザー名は${USERNAME_MAX_LENGTH}文字以内である必要があります`,
      };
    }

    // アルファベット、数字、アンダースコアのみ
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return {
        field: 'username',
        message: 'ユーザー名はアルファベット、数字、アンダースコアのみ使用可能です',
      };
    }

    return null;
  }

  /**
   * 表示名のバリデーション
   */
  static validateDisplayName(displayName: string): ValidationError | null {
    if (!displayName || displayName.trim().length === 0) {
      return { field: 'display_name', message: '表示名は必須です' };
    }

    if (displayName.length > DISPLAY_NAME_MAX_LENGTH) {
      return {
        field: 'display_name',
        message: `表示名は${DISPLAY_NAME_MAX_LENGTH}文字以内である必要があります`,
      };
    }

    return null;
  }

  /**
   * 自己紹介のバリデーション
   */
  static validateBio(bio: string): ValidationError | null {
    if (bio.length > BIO_MAX_LENGTH) {
      return {
        field: 'bio',
        message: `自己紹介は${BIO_MAX_LENGTH}文字以内である必要があります`,
      };
    }

    return null;
  }

  /**
   * 投稿内容のバリデーション
   */
  static validatePostContent(content: string): ValidationError | null {
    if (!content || content.trim().length === 0) {
      return { field: 'content', message: '投稿内容は必須です' };
    }

    if (content.length < POST_CONTENT_MIN_LENGTH) {
      return {
        field: 'content',
        message: `投稿内容は${POST_CONTENT_MIN_LENGTH}文字以上である必要があります`,
      };
    }

    if (content.length > POST_CONTENT_MAX_LENGTH) {
      return {
        field: 'content',
        message: `投稿内容は${POST_CONTENT_MAX_LENGTH}文字以内である必要があります`,
      };
    }

    return null;
  }

  /**
   * 投稿画像のバリデーション
   */
  static validatePostImages(imageUrls: string[]): ValidationError | null {
    if (imageUrls.length > POST_MAX_IMAGES) {
      return {
        field: 'image_urls',
        message: `画像は最大${POST_MAX_IMAGES}枚までです`,
      };
    }

    for (let i = 0; i < imageUrls.length; i++) {
      if (!this.isValidUrl(imageUrls[i])) {
        return {
          field: 'image_urls',
          message: `画像${i + 1}の URL が不正です`,
        };
      }
    }

    return null;
  }

  /**
   * コメント内容のバリデーション
   */
  static validateCommentContent(content: string): ValidationError | null {
    if (!content || content.trim().length === 0) {
      return { field: 'content', message: 'コメント内容は必須です' };
    }

    if (content.length < COMMENT_CONTENT_MIN_LENGTH) {
      return {
        field: 'content',
        message: `コメント内容は${COMMENT_CONTENT_MIN_LENGTH}文字以上である必要があります`,
      };
    }

    if (content.length > COMMENT_CONTENT_MAX_LENGTH) {
      return {
        field: 'content',
        message: `コメント内容は${COMMENT_CONTENT_MAX_LENGTH}文字以内である必要があります`,
      };
    }

    return null;
  }

  /**
   * URL のバリデーション
   */
  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * メールアドレスのバリデーション
   */
  static validateEmail(email: string): ValidationError | null {
    if (!email || email.trim().length === 0) {
      return { field: 'email', message: 'メールアドレスは必須です' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { field: 'email', message: 'メールアドレスが不正です' };
    }

    return null;
  }
}
