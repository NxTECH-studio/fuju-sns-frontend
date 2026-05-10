import type { ChangeEventHandler } from 'react';

import type { TextBoxProps } from '../form/textBox';

interface Props {
  failed?: string;
  value?: string;
  onChange?: ChangeEventHandler<HTMLInputElement>;
}

function identifierFormContents(props: Props): TextBoxProps {
  return {
    title: 'メール または 公開ID',
    failed: props.failed,
    failedRole: 'alert',
    inputProps: {
      type: 'text',
      name: 'identifier',
      value: props.value,
      onChange: props.onChange,
      required: true,
    },
  };
}

export default identifierFormContents;
