import { ErrorCodes, type ErrorCode } from '../ErrorCodes';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(value: string): ErrorCode | null {
  if (!EMAIL_RE.test(value)) return ErrorCodes.EMAIL_INVALID;
  return null;
}
