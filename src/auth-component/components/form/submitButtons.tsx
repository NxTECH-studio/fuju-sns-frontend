import type { CSSProperties } from 'react';

import { Button } from './button';

interface ExtraButton {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

interface Props {
  submitting: boolean;
  clickMsg: string;
  onClickMsg: string;
  otherMsg?: string;
  handleClick?: () => void;
  extraButtons?: readonly ExtraButton[];
}

const submitButtonStyle: CSSProperties = {
  minWidth: '8em',
  maxWidth: '18em',
  width: '75%',
};

const loginButtonStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  pointerEvents: 'auto',
};

const submitButtonDivStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  marginTop: '1em',
};

const SubmitButtons = (props: Props) => {
  return (
    <div data-fuju-auth-submit-buttons style={submitButtonDivStyle}>
      <Button style={submitButtonStyle} type="submit" disabled={props.submitting}>
        {props.submitting ? props.onClickMsg : props.clickMsg}
      </Button>
      {props.handleClick && props.otherMsg ? (
        <button style={loginButtonStyle} onClick={props.handleClick}>
          {props.otherMsg}
        </button>
      ) : null}
      {props.extraButtons?.map((btn, idx) => (
        // label は国際化・重複リスクがあるため index を key にする
        // （呼び出し元で順序を固定している前提）。
        <button key={idx} type="button" onClick={btn.onClick} disabled={btn.disabled}>
          {btn.label}
        </button>
      ))}
    </div>
  );
};

export { SubmitButtons };
export type { ExtraButton };
