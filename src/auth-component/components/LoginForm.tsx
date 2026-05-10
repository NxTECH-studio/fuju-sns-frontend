import { useState, type FormEvent, type ReactElement } from 'react';

import { ErrorCodes } from '../ErrorCodes';
import { isAuthError } from '../isAuthError';
import type { LoginFormProps } from '../types';
import { passwordFormContents } from './content';
import identifierFormContents from './content/identifier';
import { Form } from './form/form';
import type { TextBoxProps } from './form/textBox';

export function LoginForm(props: Readonly<LoginFormProps>): ReactElement {
  const { login, loginWithSocial, providers, onRegisterClick, className, style } = props;

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);
    try {
      await login({ identifier, password });
    } catch (err) {
      if (isAuthError(err) && err.code === ErrorCodes.INVALID_CREDENTIALS) {
        setErrorMessage('メールまたはパスワードが違います');
      } else if (isAuthError(err)) {
        setErrorMessage(err.message || err.code);
      } else {
        setErrorMessage('ログインに失敗しました');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formContents: TextBoxProps[] = [
    identifierFormContents({
      value: identifier,
      onChange: (e) => setIdentifier(e.target.value),
    }),
    passwordFormContents({
      value: password,
      onChange: (e) => setPassword(e.target.value),
    }),
  ];

  return (
    <Form
      kind="login"
      handleSubmit={handleSubmit}
      formContents={formContents}
      errors={errorMessage}
      submitting={submitting}
      clickMsg="ログイン"
      onClickMsg="ログイン中..."
      otherMsg="新規登録はこちら"
      handleClick={onRegisterClick}
      loginWithSocial={loginWithSocial}
      providers={providers}
      className={className}
      style={style}
    />
  );
}
