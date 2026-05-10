export { AuthProvider } from './AuthProvider';
export { AuthGuard } from './AuthGuard';
export { useAuth } from './hooks/useAuth';
export { useUser } from './hooks/useUser';
export { useAuthStatus } from './hooks/useAuthStatus';
export { isAuthError } from './isAuthError';
export { ErrorCodes } from './ErrorCodes';

export { LoginForm } from './components/LoginForm';
export { RegisterForm } from './components/RegisterForm';
export { MFAChallenge } from './components/MFAChallenge';
export { MFASetupWizard } from './components/MFASetupWizard';
export { ProfileEditor } from './components/ProfileEditor';
export { SocialSignupPublicIdForm } from './components/SocialSignupPublicIdForm';
export { AuthErrorFallback } from './components/AuthErrorFallback';

export { validateEmail } from './validators/email';
export { validatePassword } from './validators/password';
export { validatePublicId } from './validators/publicId';

export type {
  AuthConfig,
  AuthDiagnosticEvent,
  AuthError,
  AuthStatus,
  LoginFormProps,
  LoginResult,
  MFAChallengeProps,
  MFASetupRecommendedApp,
  MFASetupResult,
  MFASetupWizardProps,
  RegisterFormProps,
  SocialProvider,
  SocialSignupPublicIdFormProps,
  User,
} from './types';

export type { AuthProviderProps } from './AuthProvider';
export type { AuthGuardProps } from './AuthGuard';
export type { AuthContextAuthenticated } from './hooks/useAuth';
export type { AuthContextAll, AuthStatusActions, UseAuthStatusReturn } from './hooks/useAuthStatus';
export type { ErrorCode } from './ErrorCodes';
