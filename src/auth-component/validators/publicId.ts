import { ErrorCodes, type ErrorCode } from '../ErrorCodes';

const PUBLIC_ID_RE = /^[a-zA-Z0-9]{4,16}$/;

export function validatePublicId(value: string): ErrorCode | null {
  if (value.length >= 1 && value.length <= 3) {
    return ErrorCodes.PUBLIC_ID_RESERVED;
  }
  if (!PUBLIC_ID_RE.test(value)) {
    return ErrorCodes.PUBLIC_ID_FORMAT_INVALID;
  }
  return null;
}
