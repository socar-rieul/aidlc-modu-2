import { NavLink, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../hooks/useAdminAuth';

const NAV = [
  { to: '/', label: '대시보드', end: true },
  { to: '/menus', label: '메뉴' },
  { to: '/tables', label: '테이블' },
  { to: '/history', label: '과거 내역' },
];

export function AdminHeader() {
  const { storeId, clearAuth } = useAdminAuth();
  const navigate = useNavigate();
  return (
    <header className="admin-header">
      <h1>관리자</h1>
      <nav>
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'active' : undefined)} data-testid={`nav-${n.to.replace('/', '') || 'dashboard'}`}>
            {n.label}
          </NavLink>
        ))}
      </nav>
      <span className="store-info">매장 {storeId?.slice(0, 8)}…</span>
      <button
        className="secondary"
        data-testid="logout"
        onClick={() => {
          clearAuth();
          navigate('/login', { replace: true });
        }}
      >
        로그아웃
      </button>
    </header>
  );
}
