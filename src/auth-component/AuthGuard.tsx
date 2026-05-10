import { type ReactElement, useState, useEffect, type ReactNode } from 'react';

import { useAuthContext } from './AuthProvider';
import { AuthErrorFallback } from './components/AuthErrorFallback';
import { LoginForm } from './components/LoginForm';
import { MFAChallenge } from './components/MFAChallenge';
import { MFASetupWizard } from './components/MFASetupWizard';
import { RegisterForm } from './components/RegisterForm';
import { SocialSignupPublicIdForm } from './components/SocialSignupPublicIdForm';
import { useAuthStatus } from './hooks/useAuthStatus';
import type { User } from './types';

function requiresMfaSetup(user: User): boolean {
  return user.mfaEnabled === false && user.linkedProviders.length === 0;
}

export interface AuthGuardProps {
  children: ReactNode;
  required?: boolean;
  enforceMFA?: boolean;
  fallback?: ReactNode;
}

export function AuthGuard(props: Readonly<AuthGuardProps>): ReactElement {
  const { children, required = true, enforceMFA = true, fallback } = props;
  const { config } = useAuthContext();
  const status = useAuthStatus();
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const loadingFallback = <>{config.loadingFallback ?? null}</>;
  const onUnauthenticatedNavigate = config.onUnauthenticatedNavigate;
  const currentStatus = status.status;

  useEffect(() => {
    if (currentStatus === 'unauthenticated' && required && onUnauthenticatedNavigate) {
      onUnauthenticatedNavigate('/login');
    }
  }, [currentStatus, required, onUnauthenticatedNavigate]);

  if (status.status === 'idle' || status.status === 'authenticating') {
    return loadingFallback;
  }

  if (status.status === 'error') {
    return <AuthErrorFallback error={status.error ?? null} />;
  }

  if (status.status === 'authenticated') {
    if (status.user && status.needsPublicIdSetup) {
      const SignupComponent = config.socialSignupComponent ?? SocialSignupPublicIdForm;
      return (
        <SignupComponent
          user={status.user}
          submit={async (publicId) => {
            await status.confirmSocialSignupPublicId(publicId);
          }}
          skip={() => status.skipSocialSignupPublicId()}
        />
      );
    }
    if (enforceMFA && status.user && requiresMfaSetup(status.user)) {
      const SetupComponent = config.mfaSetupComponent ?? MFASetupWizard;
      return <SetupComponent />;
    }
    return <>{children}</>;
  }

  if (status.status === 'mfa_required' && enforceMFA) {
    const Component = config.mfaChallengeComponent ?? MFAChallenge;
    return (
      <Component
        verify={(input) => status.verifyMFA(input)}
        attempts={status.mfaAttempts}
        cancel={() => status.cancelMFA()}
      />
    );
  }

  if (status.status === 'unauthenticated' && required) {
    if (config.onUnauthenticatedNavigate) {
      return loadingFallback;
    }
    if (fallback !== undefined) {
      return <>{fallback}</>;
    }
    if (mode === 'register') {
      const RegisterComponent = config.registerFormComponent ?? RegisterForm;
      return (
        <RegisterComponent
          register={(input) => status.register(input)}
          login={(input) => status.login(input)}
          loginWithSocial={(provider) => status.loginWithSocial(provider)}
          providers={config.providers}
          onLoginClick={() => setMode('login')}
        />
      );
    }
    const LoginComponent = config.loginFormComponent ?? LoginForm;
    return (
      <LoginComponent
        login={(input) => status.login(input)}
        loginWithSocial={(provider) => status.loginWithSocial(provider)}
        register={(input) => status.register(input)}
        providers={config.providers}
        onRegisterClick={() => setMode('register')}
      />
    );
  }

  return <>{children}</>;
}
