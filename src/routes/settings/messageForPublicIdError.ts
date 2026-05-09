import { ErrorCodes } from "fuju-auth-react";

// AuthCore の public_id 更新で返るエラーコードを、ユーザ向けの日本語メッセージに
// 変換する。マップ未定義 / null は呼び出し側でフォールバック (err.message ?? 既定文)
// を出す前提のため、ここでは null を返す。
export function messageForPublicIdError(code: string): string | null {
  switch (code) {
    case ErrorCodes.PUBLIC_ID_ALREADY_EXISTS:
      return "この ID は既に使われています";
    case ErrorCodes.PUBLIC_ID_RESERVED:
      return "予約された ID です。別の ID を選んでください。";
    case ErrorCodes.PUBLIC_ID_FORMAT_INVALID:
      return "英数字のみで入力してください";
    case ErrorCodes.RATE_LIMIT_EXCEEDED:
      return "しばらく待ってから再度お試しください";
    default:
      return null;
  }
}
