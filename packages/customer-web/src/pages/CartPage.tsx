import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { CartItemRow } from '../components/CartItemRow';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { AdBanner } from '../components/AdBanner';
import { useAdsQuery, useCartMutations, useCartQuery, useConfirmOrder } from '../hooks/queries';
import { useSessionToken } from '../hooks/useSessionToken';
import { useSseChannel } from '../hooks/useSseChannel';
import { useToast } from '../hooks/useToast';
import { ApiError } from '../api/client';

export function CartPage() {
  const { sessionId } = useSessionToken();
  const navigate = useNavigate();
  const { data: cart, isLoading } = useCartQuery(sessionId);
  const { data: ads } = useAdsQuery('cart_bottom');
  const { add, update, remove, clear } = useCartMutations(sessionId ?? '');
  const confirmOrder = useConfirmOrder(sessionId ?? '');
  const { showInfo, showError } = useToast();
  const [askClear, setAskClear] = useState(false);
  const [askOrder, setAskOrder] = useState(false);

  useSseChannel(sessionId, () => navigate('/error/session-ended', { replace: true }));

  if (isLoading) return <div className="app-shell">불러오는 중…</div>;
  const empty = !cart || cart.items.length === 0;

  const inc = (itemId: string, qty: number) =>
    update.mutate({ itemId, quantity: qty + 1 }, { onError: () => showError('변경 실패') });
  const dec = (itemId: string, qty: number) =>
    update.mutate({ itemId, quantity: Math.max(0, qty - 1) }, { onError: () => showError('변경 실패') });
  const rm = (itemId: string) =>
    remove.mutate(itemId, { onError: () => showError('삭제 실패') });

  const onConfirmClear = () => {
    setAskClear(false);
    clear.mutate(undefined, {
      onSuccess: () => showInfo('장바구니를 비웠어요'),
      onError: () => showError('비우기 실패'),
    });
  };

  const onConfirmOrder = () => {
    setAskOrder(false);
    confirmOrder.mutate(undefined, {
      onSuccess: () => {
        showInfo('주문이 확정됐어요');
        navigate('/orders', { replace: false });
      },
      onError: (e) => {
        if (e instanceof ApiError) {
          if (e.errorCode === 'CART_EMPTY') showError('장바구니가 비어 있어요.');
          else if (e.errorCode === 'MENU_SOLDOUT' || e.errorCode === 'CART_HAS_DELETED_MENU')
            showError('품절된 메뉴가 포함되어 있어요.');
          else showError(e.message);
        } else {
          showError('주문에 실패했어요. 잠시 후 다시 시도해주세요.');
        }
      },
    });
  };

  return (
    <div className="app-shell" data-testid="cart-page">
      <PageHeader title="장바구니" />

      {empty ? (
        <p style={{ textAlign: 'center', marginTop: '2rem' }}>장바구니가 비어 있어요.</p>
      ) : (
        cart!.items.map((it) => (
          <CartItemRow
            key={it.id}
            item={it}
            onIncrement={() => inc(it.id, it.quantity)}
            onDecrement={() => dec(it.id, it.quantity)}
            onRemove={() => rm(it.id)}
          />
        ))
      )}

      {ads?.[0] && <AdBanner ad={ads[0]} />}

      <div className="bottom-bar">
        <div className="total">총 {(cart?.total ?? 0).toLocaleString()}원</div>
        {!empty && (
          <button
            data-testid="cart-clear-button"
            className="cancel"
            style={{ background: 'var(--muted)' }}
            onClick={() => setAskClear(true)}
          >비우기</button>
        )}
        <button
          data-testid="order-confirm-button"
          disabled={empty}
          onClick={() => setAskOrder(true)}
        >주문 확정</button>
      </div>

      <ConfirmDialog
        open={askClear}
        title="장바구니를 비울까요?"
        body="담아둔 메뉴가 모두 사라져요."
        confirmLabel="비우기"
        onCancel={() => setAskClear(false)}
        onConfirm={onConfirmClear}
        testIdPrefix="clear-confirm"
      />
      <ConfirmDialog
        open={askOrder}
        title="이대로 주문할까요?"
        body={
          <div>
            <strong>총 {(cart?.total ?? 0).toLocaleString()}원</strong>
            <ul style={{ marginTop: '0.5rem', paddingLeft: '1rem' }}>
              {cart?.items.map((i) => (
                <li key={i.id}>{i.menuName} × {i.quantity}</li>
              ))}
            </ul>
          </div>
        }
        confirmLabel="주문하기"
        onCancel={() => setAskOrder(false)}
        onConfirm={onConfirmOrder}
        testIdPrefix="order-confirm"
      />
    </div>
  );
}
