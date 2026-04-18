import './App.css';
import { useAuth, useUser } from './auth-component/src';

function App() {
  const auth = useAuth();
  const user = useUser();

  return (
    <>
      <h1>Fuju</h1>
      <p>ユーザーID: {user.publicId}</p>
      <p>ユーザー名: {user.displayName}({user.id})</p>
      <p>アイコンURL: {user.iconUrl}</p>
      <p>登録日時: {user.createdAt.toLocaleString()}</p>
      <p>MFA: {user.mfaEnabled ? '有効' : '無効'}, {user.mfaVerified ? '確認済み' : '未確認'}</p>
      <p>メール：{user.email}</p>
      <p>ソーシャルアカウント: {user.linkedProviders.map((account) => account).join(', ')}</p>
      <button onClick={() => auth.logout()}>ログアウト</button>
    </>
  );
}

export default App;
