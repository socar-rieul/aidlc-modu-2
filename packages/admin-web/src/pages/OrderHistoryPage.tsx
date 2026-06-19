import { useMemo, useState } from 'react';
import { AdminHeader } from '../components/AdminHeader';
import { useHistoryQuery, useTablesQuery } from '../hooks/queries';

export function OrderHistoryPage() {
  const { data: tables } = useTablesQuery();
  const [tableId, setTableId] = useState<string | null>(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const query = useMemo(() => {
    if (!tableId) return null;
    return { tableId, from: from || undefined, to: to || undefined };
  }, [tableId, from, to]);

  const { data: history, isLoading } = useHistoryQuery(query);

  return (
    <div className="shell">
      <AdminHeader />
      <h2 style={{ marginTop: '1rem' }}>과거 주문 내역</h2>

      <div className="history-filter">
        <label>
          테이블
          <select
            data-testid="history-filter-table"
            value={tableId ?? ''}
            onChange={(e) => setTableId(e.target.value || null)}
          >
            <option value="">선택…</option>
            {tables?.map((t) => (
              <option key={t.id} value={t.id}>테이블 {t.number}</option>
            ))}
          </select>
        </label>
        <label>
          시작일
          <input
            type="date"
            data-testid="history-filter-from"
            value={from.slice(0, 10)}
            onChange={(e) => setFrom(e.target.value ? new Date(e.target.value).toISOString() : '')}
          />
        </label>
        <label>
          종료일
          <input
            type="date"
            data-testid="history-filter-to"
            value={to.slice(0, 10)}
            onChange={(e) => setTo(e.target.value ? new Date(e.target.value).toISOString() : '')}
          />
        </label>
      </div>

      {!tableId ? (
        <p style={{ color: 'var(--muted)' }}>테이블을 선택해주세요.</p>
      ) : isLoading ? (
        <p>불러오는 중…</p>
      ) : !history || history.length === 0 ? (
        <p style={{ color: 'var(--muted)' }}>해당 기간 종료 세션이 없습니다.</p>
      ) : (
        history.map((h) => (
          <div key={h.id} className="card" data-testid={`history-row-${h.id}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{new Date(h.closedAt).toLocaleString()}</strong>
              <strong>{h.summary.total.toLocaleString()}원</strong>
            </div>
            <ul style={{ marginTop: '0.5rem', paddingLeft: '1rem' }}>
              {h.summary.orders.map((o) => (
                <li key={o.id}>
                  {new Date(o.createdAt).toLocaleTimeString()} · {o.total.toLocaleString()}원 (
                  {o.items.map((it) => `${it.menuName}×${it.quantity}`).join(', ')})
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}
