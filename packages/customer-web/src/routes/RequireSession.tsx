import { Navigate } from 'react-router-dom';
import { useSessionToken } from '../hooks/useSessionToken';

export function RequireSession({ children }: { children: React.ReactElement }) {
  const { token, sessionId } = useSessionToken();
  if (!token || !sessionId) return <Navigate to="/error/no-session" replace />;
  return children;
}
