import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { useOrdersQuery } from '../hooks/queries';
import { useSessionToken } from '../hooks/useSessionToken';
import { useSseChannel } from '../hooks/useSseChannel';

export function OrderHistoryPage() {
  const { sessionId } = useSessionToken();
  const navigate = useNavigate();
  const { data: orders, isLoading } = useOrdersQuery(sessionId);
  useSseChannel(sessionId, () => navigate('/error/session-ended', { replace: true }));

  if (isLoading) return <div className="app-shell">불러오는 중…</div>;
  return (
    <div className="app-shell" data-testid="orders-page">
      <PageHeader title="주문 내역" />
      {(!orders || orders.length === 0) && (
        <p style={{ textAlign: 'center', marginTop: '2rem' }}>현재 진행 중인 주문이 없습니다.</p>
      )}
      {orders?.map((o) => (
        <div key={o.id} className="card order-row" data-testid={`order-${o.id}`}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <strong>{new Date(o.createdAt).toLocaleTimeString()}</strong>
            <strong>{o.total.toLocaleString()}원</strong>
          </div>
          <ul style={{ paddingLeft: '1rem' }}>
            {o.items.map((it, idx) => (
              <li key={idx}>
                {it.menuName} × {it.quantity}
              </li>
            ))}
          </ul>
        </div>
      ))}
      <div className="bottom-bar">
        <button data-testid="back-to-menu" style={{ flex: 1 }} onClick={() => navigate('/menu')}>
          메뉴로 돌아가기
        </button>
      </div>
    </div>
  );
}
