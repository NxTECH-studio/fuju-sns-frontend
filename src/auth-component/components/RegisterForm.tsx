import { useState, type FormEvent, type ReactElement } from 'react';

import { isAuthError } from '../isAuthError';
import type { RegisterFormProps } from '../types';
import { emailFormContents, passwordFormContents, publicIdFormContents } from './content';
import { validateEmail } from '../validators/email';
import { validatePassword } from '../validators/password';
import { validatePublicId } from '../validators/publicId';
import fieldForCode from './constant/fieldForCode';
import { messageForCode } from './constant/messageForCode';
import { Form } from './form/form';
import { type TextBoxProps } from './form/textBox';
export type { RegisterFormProps } from '../types';

export function RegisterForm(props: Readonly<RegisterFormProps>): ReactElement {
  const { register, login, loginWithSocial, providers, onLoginClick, onSuccess, className, style } =
    props;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [publicId, setPublicId] = useState('');
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = (): boolean => {
    const next: Partial<Record<string, string>> = {};
    const emailErr = validateEmail(email);
    if (emailErr) next.email = messageForCode(emailErr);
    const pwErr = validatePassword(password);
    if (pwErr) next.password = messageForCode(pwErr);
    const pidErr = validatePublicId(publicId);
    if (pidErr) next.publicId = messageForCode(pidErr);
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const user = await register({ email, password, publicId });
      if (login) {
        const result = await login({ identifier: email, password });
        if (result.kind === 'mfa_required') {
          // Hand off to AuthGuard's mfa_required branch; skip onSuccess.
          return;
        }
      }
      onSuccess?.(user);
    } catch (err) {
      if (isAuthError(err)) {
        const msg = messageForCode(err.code);
        const field = fieldForCode(err.code);
        setErrors(field ? { [field]: msg } : { _form: msg });
      } else {
        setErrors({ _form: '登録に失敗しました' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formContents: TextBoxProps[] = [
    emailFormContents({
      failed: errors.email,
      value: email,
      onChange: (e) => {
        setEmail(e.target.value);
      },
    }),
    publicIdFormContents({
      failed: errors.publicId,
      value: publicId,
      onChange: (e) => {
        setPublicId(e.target.value);
      },
    }),
    passwordFormContents({
      failed: errors.password,
      value: password,
      onChange: (e) => {
        setPassword(e.target.value);
      },
    }),
  ];

  return (
    <Form
      kind="register"
      handleSubmit={handleSubmit}
      formContents={formContents}
      errors={errors._form}
      submitting={submitting}
      clickMsg="新規登録"
      onClickMsg="登録中..."
      otherMsg="ログインはこちら"
      handleClick={onLoginClick}
      loginWithSocial={loginWithSocial}
      providers={providers}
      className={className}
      style={style}
    />
  );
}
