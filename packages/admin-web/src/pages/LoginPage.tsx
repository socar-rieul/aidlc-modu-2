import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLogin } from '../hooks/queries';
import { setAuth, useAdminAuth } from '../hooks/useAdminAuth';
import { useToast } from '../hooks/useToast';
import { ApiError } from '../api/client';

const DEFAULT_STORE = '00000000-0000-0000-0000-000000000001';

export function LoginPage() {
  const navigate = useNavigate();
  const { jwt } = useAdminAuth();
  const { showError } = useToast();
  const login = useLogin();
  const [storeId, setStoreId] = useState(DEFAULT_STORE);
  const [username, setUsername] = useState('owner');
  const [password, setPassword] = useState('demo1234');

  if (jwt) {
    navigate('/', { replace: true });
    return null;
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate(
      { storeId, username, password },
      {
        onSuccess: (data) => {
          setAuth(data);
          navigate('/', { replace: true });
        },
        onError: (err) => {
          if (err instanceof ApiError) {
            if (err.errorCode === 'LOGIN_FAILED') showError('매장ID·사용자명·비밀번호를 확인해주세요.');
            else if (err.errorCode === 'LOGIN_RATE_LIMITED') showError('로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.');
            else showError(err.message);
          } else {
            showError('네트워크 오류가 발생했어요.');
          }
        },
      },
    );
  };

  return (
    <form className="login-shell" onSubmit={onSubmit} data-testid="login-form">
      <h1>관리자 로그인</h1>
      <label>
        매장 ID
        <input data-testid="login-storeId" value={storeId} onChange={(e) => setStoreId(e.target.value)} required />
      </label>
      <label>
        사용자명
        <input data-testid="login-username" value={username} onChange={(e) => setUsername(e.target.value)} required />
      </label>
      <label>
        비밀번호
        <input
          type="password"
          data-testid="login-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>
      <button type="submit" data-testid="login-submit" disabled={login.isPending}>
        {login.isPending ? '로그인 중…' : '로그인'}
      </button>
      <p style={{ fontSize: '0.875rem', color: 'var(--muted)', textAlign: 'center' }}>
        시드 계정: owner / crew · demo1234
      </p>
    </form>
  );
}
