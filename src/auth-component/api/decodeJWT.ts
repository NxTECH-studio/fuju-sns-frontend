export interface JWTPayload {
  sub?: string;
  exp?: number;
  iat?: number;
  type?: string;
  [key: string]: unknown;
}

function base64UrlDecode(input: string): string {
  const padded = input + '='.repeat((4 - (input.length % 4)) % 4);
  const base64 = padded.replaceAll('-', '+').replaceAll('_', '/');
  if (typeof atob === 'function') {
    const binary = atob(base64);
    try {
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.codePointAt(i) ?? 0;
      return new TextDecoder().decode(bytes);
    } catch {
      return binary;
    }
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

export function decodeJWT(token: string): JWTPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const payload = parts[1];
  if (!payload) return null;
  try {
    const json = base64UrlDecode(payload);
    return JSON.parse(json) as JWTPayload;
  } catch {
    return null;
  }
}

export function getTokenExp(token: string): number | null {
  const payload = decodeJWT(token);
  if (!payload || typeof payload.exp !== 'number') return null;
  return payload.exp;
}
