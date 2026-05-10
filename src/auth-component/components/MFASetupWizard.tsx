import { type FormEvent, useId, useState, type ReactElement, type ReactNode } from 'react';

import { useAuth } from '../hooks/useAuth';
import { isAuthError } from '../isAuthError';
import type { MFASetupRecommendedApp, MFASetupResult, MFASetupWizardProps } from '../types';
import { Form } from './form/form';
import type { TextBoxProps } from './form/textBox';

type Step = 'intro' | 'qr' | 'confirm' | 'done';

const DEFAULT_RECOMMENDED_APPS: ReadonlyArray<MFASetupRecommendedApp> = [
  { name: 'Google Authenticator' },
  { name: 'Microsoft Authenticator' },
  { name: '1Password' },
  { name: 'Authy' },
];

const DEFAULT_QR_INSTRUCTIONS =
  'お使いの authenticator アプリで以下の QR コードをスキャンするか、シークレットキーを直接入力してください。';

const DEFAULT_DEEPLINK_LABEL = 'authenticator アプリで開く';

const DEFAULT_INTRO_DESCRIPTION =
  'ログインに 2 段階認証を追加します。お手元のスマホに認証アプリをインストールしてから次に進んでください。';

const DEFAULT_CONFIRM_DESCRIPTION =
  'authenticator アプリに表示された 6 桁のコードを入力してください。';

export function MFASetupWizard(props: Readonly<MFASetupWizardProps>): ReactElement {
  const {
    onComplete,
    className,
    style,
    introContent,
    recommendedApps = DEFAULT_RECOMMENDED_APPS,
    qrInstructions,
    mobileDeepLinkLabel = DEFAULT_DEEPLINK_LABEL,
    showSecretByDefault = false,
  } = props;
  const { setupMFA, enableMFA } = useAuth();

  const [step, setStep] = useState<Step>('intro');
  const [result, setResult] = useState<MFASetupResult | null>(null);
  const [code, setCode] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [secretRevealed, setSecretRevealed] = useState<boolean>(showSecretByDefault);
  const secretRegionId = useId();
  const deeplinkHintId = useId();

  const begin = async () => {
    setErrorMessage(null);
    setBusy(true);
    try {
      const res = await setupMFA();
      setResult(res);
      setStep('qr');
    } catch (err) {
      setErrorMessage(isAuthError(err) ? err.message : '開始に失敗しました。');
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setBusy(true);
    try {
      await enableMFA(code);
      setStep('done');
      onComplete?.();
    } catch (err) {
      setErrorMessage(isAuthError(err) ? err.message : '有効化に失敗しました。');
    } finally {
      setBusy(false);
    }
  };

  const confirmFields: TextBoxProps[] = [
    {
      title: 'TOTP コード',
      failedRole: 'alert',
      inputProps: {
        type: 'text',
        inputMode: 'numeric',
        autoComplete: 'one-time-code',
        value: code,
        onChange: (e) => setCode(e.target.value),
        required: true,
      },
    },
  ];

  return (
    <div data-fuju-auth-form="mfa-setup" className={className} style={style}>
      {step === 'intro' ? (
        <>
          {introContent !== undefined ? (
            introContent
          ) : (
            <DefaultIntro recommendedApps={recommendedApps} />
          )}
          <button type="button" disabled={busy} onClick={begin}>
            開始
          </button>
        </>
      ) : null}

      {step === 'qr' && result ? (
        <>
          {qrInstructions !== undefined ? qrInstructions : <p>{DEFAULT_QR_INSTRUCTIONS}</p>}
          <img alt="MFA QR" src={result.qrCodeDataURL} />
          <p>
            <a
              href={result.otpauthURL}
              data-fuju-auth-mfa-deeplink
              aria-describedby={deeplinkHintId}
            >
              {mobileDeepLinkLabel}
            </a>
            <span id={deeplinkHintId} hidden>
              authenticator アプリが起動します。
            </span>
          </p>
          <div data-fuju-auth-mfa-secret>
            <button
              type="button"
              aria-expanded={secretRevealed}
              aria-controls={secretRegionId}
              onClick={() => setSecretRevealed((prev) => !prev)}
            >
              {secretRevealed ? 'シークレットキーを隠す' : 'シークレットキーを表示'}
            </button>
            {secretRevealed ? (
              <p id={secretRegionId}>
                <strong>Secret:</strong> <code>{result.secret}</code>{' '}
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(result.secret).catch(() => undefined);
                  }}
                >
                  コピー
                </button>
              </p>
            ) : null}
          </div>
          <section>
            <p>
              <strong>リカバリーコード</strong>（この画面以降は再表示されません）
            </p>
            <ul>
              {result.recoveryCodes.map((rc) => (
                <li key={rc}>
                  <code>{rc}</code>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard
                  ?.writeText(result.recoveryCodes.join('\n'))
                  .catch(() => undefined);
              }}
            >
              コピー
            </button>
            <label>
              <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
              <span>保存しました</span>
            </label>
          </section>
          <button type="button" disabled={!saved} onClick={() => setStep('confirm')}>
            次へ
          </button>
        </>
      ) : null}

      {step === 'confirm' ? (
        <Form
          kind="mfa-setup-confirm"
          ariaLabel="mfa-setup-confirm"
          noOuterWrapper
          description={<p>{DEFAULT_CONFIRM_DESCRIPTION}</p>}
          handleSubmit={confirm}
          formContents={confirmFields}
          errors={errorMessage}
          submitting={busy}
          clickMsg="有効化"
          onClickMsg="有効化中..."
        />
      ) : null}

      {step === 'done' ? (
        <p>MFA を有効化しました。次回のログインから認証コードの入力が必要になります。</p>
      ) : null}

      {errorMessage && step !== 'confirm' ? (
        <p role="alert" data-fuju-auth-error>
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

function DefaultIntro(props: {
  recommendedApps: ReadonlyArray<MFASetupRecommendedApp>;
}): ReactElement {
  const { recommendedApps } = props;
  return (
    <>
      <p>{DEFAULT_INTRO_DESCRIPTION}</p>
      {recommendedApps.length > 0 ? (
        <>
          <p>対応アプリ例:</p>
          <ul>
            {recommendedApps.map((app) => (
              <li key={app.name}>
                <RecommendedAppEntry app={app} />
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </>
  );
}

function RecommendedAppEntry(props: { app: MFASetupRecommendedApp }): ReactElement {
  const { app } = props;
  let label: ReactNode = app.name;
  if (app.url !== undefined && app.url !== '') {
    label = (
      <a href={app.url} target="_blank" rel="noreferrer">
        {app.name}
      </a>
    );
  }
  return (
    <>
      {label}
      {app.note !== undefined && app.note !== '' ? <span> — {app.note}</span> : null}
    </>
  );
}
