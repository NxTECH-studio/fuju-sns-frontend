/**
 * Google Authenticator Key URI Format に従った `otpauth://` URI を組み立てる。
 *
 * 仕様: https://github.com/google/google-authenticator/wiki/Key-Uri-Format
 *
 * - パス部の `<issuer>:<accountName>` の `:` は文字どおり残す（多くの authenticator
 *   アプリがそのままラベルとして読む）。
 * - `issuer` / `accountName` は個別に `encodeURIComponent` でエスケープする。
 * - 互換のためクエリにも `issuer` を付ける（古いアプリがパス側を読まないため）。
 * - `secret` は AuthCore が返す base32 文字列をそのまま使う想定。
 */
export interface BuildOtpauthURLInput {
  readonly secret: string;
  readonly accountName: string;
  readonly issuer: string;
  readonly algorithm?: 'SHA1';
  readonly digits?: 6;
  readonly period?: 30;
}

export function buildOtpauthURL(input: BuildOtpauthURLInput): string {
  const algorithm = input.algorithm ?? 'SHA1';
  const digits = input.digits ?? 6;
  const period = input.period ?? 30;

  const label = `${encodeURIComponent(input.issuer)}:${encodeURIComponent(input.accountName)}`;
  // `URLSearchParams` だとスペースが `+` でエンコードされ、一部の authenticator
  // アプリが正しく解釈しないことがある。Key URI Format の例に揃えて `%20` で揃えるため、
  // 各値を個別に `encodeURIComponent` する。
  const query = [
    `secret=${encodeURIComponent(input.secret)}`,
    `issuer=${encodeURIComponent(input.issuer)}`,
    `algorithm=${algorithm}`,
    `digits=${String(digits)}`,
    `period=${String(period)}`,
  ].join('&');

  return `otpauth://totp/${label}?${query}`;
}
