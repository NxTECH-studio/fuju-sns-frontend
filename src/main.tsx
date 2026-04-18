import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider, AuthGuard } from './auth-component/src';
import App from './App';

import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider
      config={{
        baseURL: 'https://auth.sheeplab.net',
      }}
    >
      <AuthGuard>
        <App />
      </AuthGuard>
    </AuthProvider>
  </StrictMode>,
);
