import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';

const buttonStyle: CSSProperties = {
  padding: '0.5em 1em',
  minHeight: '1.5em',
  minWidth: '6em',
  width: '100%',
  fontSize: '1rem',
  color: 'white',
  border: '1px solid gray',
  borderRadius: '1em',
  background: 'none',
  cursor: 'pointer',
  pointerEvents: 'auto',
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

const Button = ({ children, ...buttonProps }: ButtonProps) => {
  const { style, ...props } = buttonProps;
  return (
    <button style={{ ...buttonStyle, ...style }} {...props}>
      {children}
    </button>
  );
};

export { Button };
