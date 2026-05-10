import type { AriaRole, CSSProperties, DetailedHTMLProps, InputHTMLAttributes, JSX } from 'react';

interface Props {
  title: string;
  failed?: string;
  failedRole: AriaRole;
  inputProps?: DetailedHTMLProps<InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>;
}

const labelStyle: CSSProperties = {
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  margin: '0.5em 0',
  width: '100%',
  fontSize: '1rem',
};

const inputStyle: CSSProperties = {
  boxSizing: 'border-box',
  padding: '0.25em 0.5em',
  margin: '0.1em 0',
  border: '1px solid gray',
  borderRadius: '0.25em',
  background: 'none',
  fontSize: '1.5em',
};

const titleStyle: CSSProperties = {
  boxSizing: 'border-box',
  padding: '0 0.25em',
  width: '100%',
  textAlign: 'left',
};

const errorStyle: CSSProperties = {
  marginLeft: '0.5em',
  width: '100%',
  textAlign: 'left',
  color: 'red',
  fontSize: '0.75em',
};

const TextBox = (props: Props): JSX.Element => {
  return (
    <label style={labelStyle}>
      <span style={titleStyle}>
        <span>{props.title}</span>
        {props.failed ? (
          <span style={errorStyle} role={props.failedRole}>
            {props.failed}
          </span>
        ) : (
          <span style={errorStyle}>&nbsp;</span>
        )}
      </span>
      <input style={inputStyle} {...props.inputProps} />
    </label>
  );
};

export type { Props as TextBoxProps };
export default TextBox;
