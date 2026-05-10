import type { ChangeEventHandler } from 'react';

import type { TextBoxProps } from '../form/textBox';

interface Props {
  failed?: string;
  value?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
}

function emailFormContents(props: Props): TextBoxProps {
  return {
    title: 'メール',
    failed: props.failed,
    failedRole: 'alert',
    inputProps: {
      type: 'email',
      name: 'email',
      autoComplete: 'email',
      value: props.value,
      onChange: props.onChange,
      required: true,
    },
  };
}

export default emailFormContents;
