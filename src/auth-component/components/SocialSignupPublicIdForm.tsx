import { useState, type FormEvent, type ReactElement } from 'react';

import { ErrorCodes } from '../ErrorCodes';
import { isAuthError } from '../isAuthError';
import type { SocialSignupPublicIdFormProps } from '../types';
import { validatePublicId } from '../validators/publicId';
import { Form } from './form/form';
import type { TextBoxProps } from './form/textBox';

export type { SocialSignupPublicIdFormProps } from '../types';

export function SocialSignupPublicIdForm(
  props: Readonly<SocialSignupPublicIdFormProps>,
): ReactElement {
  const { user, submit, skip, className, style } = props;
  const [publicId, setPublicId] = useState(user.publicId);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const localErr = validatePublicId(publicId);
    if (localErr !== null) {
      setError(messageForCode(localErr));
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await submit(publicId);
    } catch (err) {
      if (isAuthError(err)) {
        setError(messageForCode(err.code));
      } else {
        setError('公開IDの設定に失敗しました');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formContents: TextBoxProps[] = [
    {
      title: '公開ID',
      failedRole: 'alert',
      inputProps: {
        type: 'text',
        name: 'publicId',
        value: publicId,
        onChange: (e) => setPublicId(e.target.value),
        required: true,
        minLength: 4,
        maxLength: 16,
      },
    },
  ];

  return (
    <Form
      kind="social-signup"
      description={<p>公開IDを設定してください</p>}
      handleSubmit={handleSubmit}
      formContents={formContents}
      errors={error}
      submitting={submitting}
      clickMsg="設定する"
      onClickMsg="設定中..."
      extraButtons={[
        {
          label: '後で設定する',
          onClick: skip,
          disabled: submitting,
        },
      ]}
      className={className}
      style={style}
    />
  );
}

function messageForCode(code: string): string {
  switch (code) {
    case ErrorCodes.PUBLIC_ID_RESERVED:
      return '1-3 文字は予約されています。4 文字以上で。';
    case ErrorCodes.PUBLIC_ID_FORMAT_INVALID:
      return '英数字 4-16 文字で。';
    case ErrorCodes.PUBLIC_ID_ALREADY_EXISTS:
      return 'この公開IDは既に使われています。';
    default:
      return '入力を確認してください。';
  }
}
