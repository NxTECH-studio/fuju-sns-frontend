import { useState, type FormEvent, type ReactElement } from 'react';

import { ErrorCodes } from '../ErrorCodes';
import { isAuthError } from '../isAuthError';
import type { MFAChallengeProps } from '../types';
import { Form } from './form/form';
import type { TextBoxProps } from './form/textBox';

const MAX_ATTEMPTS_BEFORE_LOCK = 5;

export function MFAChallenge(props: Readonly<MFAChallengeProps>): ReactElement {
  const { verify, attempts, cancel, className, style } = props;
  const [useRecovery, setUseRecovery] = useState(false);
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);
    try {
      await verify(useRecovery ? { recoveryCode: code } : { code });
      setCode('');
    } catch (err) {
      if (isAuthError(err)) {
        if (
          err.code === ErrorCodes.TOTP_CODE_INVALID ||
          err.code === ErrorCodes.RECOVERY_CODE_INVALID
        ) {
          setErrorMessage('コードが正しくありません。');
        } else if (err.code === ErrorCodes.RATE_LIMIT_EXCEEDED) {
          setErrorMessage(
            err.retryAfterSec
              ? `${err.retryAfterSec} 秒後に再試行してください。`
              : 'しばらくしてから再試行してください。',
          );
        } else {
          setErrorMessage(err.message || err.code);
        }
      } else {
        setErrorMessage('検証に失敗しました。');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const remaining = Math.max(0, MAX_ATTEMPTS_BEFORE_LOCK - attempts);
  const warnLock = attempts >= 3 && attempts < MAX_ATTEMPTS_BEFORE_LOCK;

  const formContents: TextBoxProps[] = [
    {
      title: useRecovery ? 'リカバリーコード' : '認証アプリのコード (6桁)',
      failedRole: 'alert',
      inputProps: {
        type: 'text',
        name: 'code',
        autoComplete: 'one-time-code',
        inputMode: useRecovery ? 'text' : 'numeric',
        value: code,
        onChange: (e) => setCode(e.target.value),
        required: true,
      },
    },
  ];

  return (
    <Form
      kind="mfa"
      ariaLabel="mfa-challenge"
      handleSubmit={handleSubmit}
      formContents={formContents}
      afterFields={
        warnLock ? (
          <output data-fuju-auth-warning>残り {remaining} 回で一時ロックされます。</output>
        ) : null
      }
      errors={errorMessage}
      submitting={submitting}
      clickMsg="検証"
      onClickMsg="検証中..."
      extraButtons={[
        {
          label: useRecovery ? 'TOTP に切替' : 'リカバリーコードを使う',
          onClick: () => {
            setUseRecovery((v) => !v);
            setCode('');
            setErrorMessage(null);
          },
        },
        {
          label: 'キャンセル',
          onClick: cancel,
        },
      ]}
      className={className}
      style={style}
    />
  );
}
