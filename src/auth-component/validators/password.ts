import { ErrorCodes, type ErrorCode } from '../ErrorCodes';

export const PASSWORD_MIN_LENGTH = 6;

export function validatePassword(value: string): ErrorCode | null {
  if (value.length < PASSWORD_MIN_LENGTH) return ErrorCodes.PASSWORD_TOO_SHORT;
  return null;
}
