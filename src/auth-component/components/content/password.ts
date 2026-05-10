import type { ChangeEventHandler } from 'react';

import type { TextBoxProps } from '../form/textBox';

interface Props {
  failed?: string;
  value?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
}

function passwordFormContents(props: Props): TextBoxProps {
  return {
    title: 'パスワード',
    failed: props.failed,
    failedRole: 'alert',
    inputProps: {
      type: 'password',
      name: 'password',
      value: props.value,
      onChange: props.onChange,
      required: true,
      minLength: 6,
    },
  };
}

export default passwordFormContents;
