import type { ChangeEventHandler } from 'react';

import type { TextBoxProps } from '../form/textBox';

interface Props {
  failed?: string;
  value?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
}

function publicIdFormContents(props: Props): TextBoxProps {
  return {
    title: '公開ID',
    failed: props.failed,
    failedRole: 'alert',
    inputProps: {
      type: 'text',
      name: 'publicId',
      value: props.value,
      onChange: props.onChange,
      required: true,
      minLength: 4,
      maxLength: 16,
    },
  };
}

export default publicIdFormContents;
