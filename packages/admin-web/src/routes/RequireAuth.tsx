import { Navigate } from 'react-router-dom';
import { useAdminAuth } from '../hooks/useAdminAuth';

export function RequireAuth({ children }: { children: React.ReactElement }) {
  const { jwt } = useAdminAuth();
  if (!jwt) return <Navigate to="/login" replace />;
  return children;
}
