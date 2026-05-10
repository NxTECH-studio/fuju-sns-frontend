import {
  type CSSProperties,
  useState,
  type ReactElement,
  type FormEvent,
  type ChangeEvent,
} from 'react';

import { ErrorCodes } from '../ErrorCodes';
import { useAuth } from '../hooks/useAuth';
import { isAuthError } from '../isAuthError';
import { validatePublicId } from '../validators/publicId';
import { Form } from './form/form';
import type { TextBoxProps } from './form/textBox';

export interface ProfileEditorProps {
  className?: string;
  style?: CSSProperties;
}

const MAX_ICON_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function ProfileEditor(props: Readonly<ProfileEditorProps>): ReactElement {
  const { className, style } = props;
  const { user, updatePublicID, updateIcon, disableMFA } = useAuth();

  const [publicIdDraft, setPublicIdDraft] = useState(user.publicId);
  const [publicIdError, setPublicIdError] = useState<string | null>(null);
  const [iconError, setIconError] = useState<string | null>(null);
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [disableCode, setDisableCode] = useState('');

  const submitPublicId = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPublicIdError(null);
    const clientErr = validatePublicId(publicIdDraft);
    if (clientErr) {
      setPublicIdError(msg(clientErr));
      return;
    }
    setBusy(true);
    try {
      await updatePublicID(publicIdDraft);
    } catch (err) {
      setPublicIdError(isAuthError(err) ? msg(err.code) : '更新に失敗しました。');
    } finally {
      setBusy(false);
    }
  };

  const submitIcon = async (e: ChangeEvent<HTMLInputElement>) => {
    setIconError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_ICON_BYTES) {
      setIconError('ファイルサイズは 5MB までです。');
      return;
    }
    if (!ALLOWED_MIME.has(file.type)) {
      setIconError('JPEG / PNG / WebP のみ対応しています。');
      return;
    }
    setBusy(true);
    try {
      await updateIcon(file);
    } catch (err) {
      setIconError(isAuthError(err) ? msg(err.code) : 'アップロードに失敗しました。');
    } finally {
      setBusy(false);
    }
  };

  const submitDisableMFA = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMfaError(null);
    setBusy(true);
    try {
      await disableMFA(disableCode);
      setDisableCode('');
    } catch (err) {
      setMfaError(isAuthError(err) ? msg(err.code) : '無効化に失敗しました。');
    } finally {
      setBusy(false);
    }
  };

  const publicIdFields: TextBoxProps[] = [
    {
      title: '公開 ID',
      failedRole: 'alert',
      inputProps: {
        type: 'text',
        value: publicIdDraft,
        minLength: 4,
        maxLength: 16,
        onChange: (e) => setPublicIdDraft(e.target.value),
      },
    },
  ];

  const mfaDisableFields: TextBoxProps[] = [
    {
      title: '現在の TOTP',
      failedRole: 'alert',
      inputProps: {
        type: 'text',
        inputMode: 'numeric',
        value: disableCode,
        onChange: (e) => setDisableCode(e.target.value),
        required: true,
      },
    },
  ];

  return (
    <div data-fuju-auth-form="profile" className={className} style={style}>
      <section>
        <h3>アイコン</h3>
        {user.iconUrl ? <img src={user.iconUrl} alt="" /> : null}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={submitIcon}
          disabled={busy}
        />
        {iconError ? (
          <p role="alert" data-fuju-auth-error>
            {iconError}
          </p>
        ) : null}
      </section>

      <Form
        kind="profile-public-id"
        ariaLabel="profile-public-id"
        noOuterWrapper
        description={<h3>公開 ID</h3>}
        handleSubmit={submitPublicId}
        formContents={publicIdFields}
        errors={publicIdError}
        submitting={busy}
        clickMsg="更新"
        onClickMsg="更新中..."
      />

      <section>
        <h3>MFA</h3>
        {user.mfaEnabled ? (
          <Form
            kind="profile-disable-mfa"
            ariaLabel="profile-disable-mfa"
            noOuterWrapper
            handleSubmit={submitDisableMFA}
            formContents={mfaDisableFields}
            errors={mfaError}
            submitting={busy}
            clickMsg="MFA を無効化"
            onClickMsg="無効化中..."
          />
        ) : (
          <p>MFA は未設定です。</p>
        )}
      </section>
    </div>
  );
}

function msg(code: string): string {
  switch (code) {
    case ErrorCodes.PUBLIC_ID_ALREADY_EXISTS:
      return 'この公開IDは既に使われています。';
    case ErrorCodes.PUBLIC_ID_RESERVED:
      return '1-3 文字は予約されています。4 文字以上で。';
    case ErrorCodes.PUBLIC_ID_FORMAT_INVALID:
      return '英数字 4-16 文字で。';
    case ErrorCodes.FILE_TOO_LARGE:
      return 'ファイルサイズが大きすぎます。';
    case ErrorCodes.FILE_FORMAT_INVALID:
      return '対応していない画像形式です。';
    case ErrorCodes.TOTP_CODE_INVALID:
      return 'TOTP コードが正しくありません。';
    default:
      return '更新に失敗しました。';
  }
}
