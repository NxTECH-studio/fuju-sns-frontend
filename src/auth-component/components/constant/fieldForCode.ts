import { ErrorCodes } from '../../ErrorCodes';

function fieldForCode(code: string): string | null {
  switch (code) {
    case ErrorCodes.EMAIL_INVALID:
    case ErrorCodes.USER_ALREADY_EXISTS:
      return 'email';
    case ErrorCodes.PASSWORD_TOO_SHORT:
      return 'password';
    case ErrorCodes.PUBLIC_ID_RESERVED:
    case ErrorCodes.PUBLIC_ID_FORMAT_INVALID:
    case ErrorCodes.PUBLIC_ID_ALREADY_EXISTS:
      return 'publicId';
    default:
      return null;
  }
}

export default fieldForCode;
