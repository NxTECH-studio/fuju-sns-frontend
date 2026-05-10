import type { CSSProperties, JSX, ReactNode } from 'react';

import { SubmitButtons, type ExtraButton } from './submitButtons';
import TextBox, { type TextBoxProps } from './textBox';
import { Social } from './withSocial';
import { type SocialProvider } from '../..';

interface Props {
  kind: string;
  ariaLabel?: string;
  description?: ReactNode;
  afterFields?: ReactNode;
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  formContents: readonly TextBoxProps[];
  errors?: string | null;
  submitting: boolean;
  clickMsg: string;
  onClickMsg: string;
  otherMsg?: string;
  handleClick?: () => void;
  extraButtons?: readonly ExtraButton[];
  providers?: readonly SocialProvider[];
  loginWithSocial?: (provider: SocialProvider) => void;
  noOuterWrapper?: boolean;
  className?: string;
  style?: CSSProperties;
}

const formStyle: CSSProperties = {
  width: '100%',
  minWidth: '10em',
  maxWidth: '25em',
  padding: '1em',
  boxSizing: 'border-box',
};

const outerStyle: CSSProperties = {
  width: '100%',
  display: 'flex',
  justifyContent: 'center',
};

const Form = (props: Props): JSX.Element => {
  const ariaLabel = props.ariaLabel ?? props.kind;
  const form = (
    <form
      aria-label={ariaLabel}
      data-fuju-auth-form={props.kind}
      onSubmit={props.handleSubmit}
      className={props.className}
      style={props.noOuterWrapper ? props.style : { ...formStyle, ...props.style }}
      noValidate
    >
      {props.description}
      {props.formContents.map((formContent, idx) => (
        // title をキーにすると MFAChallenge の TOTP/リカバリ切替で input が
        // 毎回アンマウントされるため index を使う（配列順は呼び出し元で固定）。
        <TextBox key={idx} {...formContent} />
      ))}
      {props.afterFields}
      {props.errors ? (
        <p role="alert" data-fuju-auth-error>
          {props.errors}
        </p>
      ) : null}
      <SubmitButtons
        submitting={props.submitting}
        handleClick={props.handleClick}
        clickMsg={props.clickMsg}
        onClickMsg={props.onClickMsg}
        otherMsg={props.otherMsg}
        extraButtons={props.extraButtons}
      />
      {props.loginWithSocial && props.providers?.length ? (
        <Social providers={props.providers} onClick={props.loginWithSocial} />
      ) : null}
    </form>
  );

  if (props.noOuterWrapper) {
    return form;
  }

  return <div style={outerStyle}>{form}</div>;
};

export { Form };
