import { ErrorCodes } from '../../ErrorCodes';

const MESSAGE_FOR_CODE: Record<string, string> = {
  [ErrorCodes.EMAIL_INVALID]: 'メール形式が不正です。',
  [ErrorCodes.PASSWORD_TOO_SHORT]: '6 文字以上必要です。',
  [ErrorCodes.PUBLIC_ID_RESERVED]: '1-3 文字は予約されています。4 文字以上で。',
  [ErrorCodes.PUBLIC_ID_FORMAT_INVALID]: '英数字 4-16 文字で。',
  [ErrorCodes.PUBLIC_ID_ALREADY_EXISTS]: 'この公開IDは既に使われています。',
  [ErrorCodes.USER_ALREADY_EXISTS]: 'このメールは既に登録されています。',
};

export function messageForCode(code: string): string {
  return MESSAGE_FOR_CODE[code] || '入力を確認してください。';
}

export default MESSAGE_FOR_CODE;
