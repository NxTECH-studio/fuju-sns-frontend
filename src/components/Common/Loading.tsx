/**
 * ローディングコンポーネント
 */

import type { FC } from 'react';
import styles from './Loading.module.css';

export const Loading: FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.spinner} />
      <p className={styles.text}>読み込み中...</p>
    </div>
  );
};

export default Loading;
