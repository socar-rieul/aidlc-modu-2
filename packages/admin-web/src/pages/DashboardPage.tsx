import { useCallback, useEffect, useState } from 'react';
import type { TableCardDto } from '@table-order/shared';
import { AdminHeader } from '../components/AdminHeader';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useDashboardQuery, useDeleteOrder, useTableMutations } from '../hooks/queries';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { useStoreSseChannel } from '../hooks/useStoreSseChannel';
import { useToast } from '../hooks/useToast';

export function DashboardPage() {
  const { storeId } = useAdminAuth();
  const { data, isLoading } = useDashboardQuery();
  const { closeSession } = useTableMutations();
  const deleteOrder = useDeleteOrder();
  const { showInfo, showError } = useToast();
  const [recentlyChanged, setRecentlyChanged] = useState<Set<string>>(new Set());
  const [openCard, setOpenCard] = useState<TableCardDto | null>(null);
  const [askClose, setAskClose] = useState<TableCardDto | null>(null);
  const [askDelete, setAskDelete] = useState<{ orderId: string } | null>(null);

  const onNewOrder = useCallback(() => {
    showInfo('신규 주문이 들어왔어요!');
  }, [showInfo]);

  useStoreSseChannel(storeId, onNewOrder);

  useEffect(() => {
    if (!data) return;
    const ids = new Set(data.tables.filter((t) => t.totalAmount > 0).map((t) => t.tableId));
    setRecentlyChanged(ids);
    const t = setTimeout(() => setRecentlyChanged(new Set()), 2500);
    return () => clearTimeout(t);
  }, [data]);

  if (isLoading) return <div className="shell"><AdminHeader /><p>불러오는 중…</p></div>;

  return (
    <div className="shell">
      <AdminHeader />
      <div className="table-grid">
        {data?.tables.map((t) => {
          const empty = !t.activeSessionId;
          return (
            <div
              key={t.tableId}
              className={`table-card ${empty ? 'empty' : ''} ${recentlyChanged.has(t.tableId) ? 'is-new' : ''}`}
              data-testid={`table-card-${t.tableId}`}
              onClick={() => setOpenCard(t)}
            >
              <div className="header">
                <strong>테이블 {t.tableNumber}</strong>
                <span className="total">{t.totalAmount.toLocaleString()}원</span>
              </div>
              {empty ? (
                <p className="preview">주문 없음</p>
              ) : (
                <>
                  <p className="preview">주문 {t.recentOrders.length}건</p>
                  {t.recentOrders.slice(0, 2).map((o) => (
                    <p key={o.id} className="preview">
                      · {o.topItem ? `${o.topItem.menuName} × ${o.topItem.quantity}` : ''} ({o.total.toLocaleString()}원)
                    </p>
                  ))}
                </>
              )}
              {!empty && (
                <div className="actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="danger"
                    data-testid={`table-card-${t.tableId}-close`}
                    onClick={() => setAskClose(t)}
                  >이용 완료</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 주문 상세 모달 */}
      {openCard && (
        <div className="dialog-backdrop" onClick={() => setOpenCard(null)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()} data-testid="order-detail-modal">
            <h2>테이블 {openCard.tableNumber} 주문 상세</h2>
            {openCard.recentOrders.length === 0 ? (
              <p>주문이 없습니다.</p>
            ) : (
              openCard.recentOrders.map((o) => (
                <div key={o.id} className="card" style={{ margin: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>{new Date(o.createdAt).toLocaleTimeString()}</strong>
                    <strong>{o.total.toLocaleString()}원</strong>
                  </div>
                  {o.topItem && (
                    <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
                      대표: {o.topItem.menuName} × {o.topItem.quantity}
                    </p>
                  )}
                  <button
                    className="danger"
                    data-testid={`order-${o.id}-delete`}
                    style={{ marginTop: '0.5rem' }}
                    onClick={() => setAskDelete({ orderId: o.id })}
                  >주문 삭제</button>
                </div>
              ))
            )}
            <div className="actions">
              <button className="secondary" onClick={() => setOpenCard(null)}>닫기</button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!askClose}
        title={`테이블 ${askClose?.tableNumber}번 이용을 종료할까요?`}
        body="진행 중 주문은 정산 내역으로 이동하고, 손님 폰의 세션이 종료됩니다."
        confirmLabel="종료"
        danger
        onCancel={() => setAskClose(null)}
        onConfirm={() => {
          const t = askClose!;
          setAskClose(null);
          closeSession.mutate(t.tableId, {
            onSuccess: (data) =>
              showInfo(
                data.movedOrders > 0
                  ? `주문 ${data.movedOrders}건이 정산 내역으로 이동됐어요.`
                  : '활성 세션을 종료했어요.',
              ),
            onError: (e: any) => showError(e.message ?? '실패'),
          });
        }}
        testIdPrefix="close-session-confirm"
      />

      <ConfirmDialog
        open={!!askDelete}
        title="이 주문을 삭제할까요?"
        body="손님 폰에도 즉시 반영됩니다."
        confirmLabel="삭제"
        danger
        onCancel={() => setAskDelete(null)}
        onConfirm={() => {
          const id = askDelete!.orderId;
          setAskDelete(null);
          deleteOrder.mutate(id, {
            onSuccess: () => {
              showInfo('주문이 삭제됐어요.');
              setOpenCard(null);
            },
            onError: (e: any) => {
              if (e?.errorCode === 'ORDER_IN_HISTORY') showError('이미 종료된 테이블의 주문은 수정할 수 없습니다.');
              else showError(e?.message ?? '실패');
            },
          });
        }}
        testIdPrefix="delete-order-confirm"
      />
    </div>
  );
}
