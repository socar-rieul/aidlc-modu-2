import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { CartDto, OrderDto } from '@table-order/shared';
import { clearSession, getSessionToken } from './useSessionToken';

export function useSseChannel(sessionId: string | null, onSessionClosed?: () => void): void {
  const qc = useQueryClient();

  useEffect(() => {
    if (!sessionId) return;
    const token = getSessionToken();
    if (!token) return;
    const es = new EventSource(`http://localhost:3000/sse/sessions/${sessionId}?token=${encodeURIComponent(token)}`);

    es.onopen = () => {
      qc.invalidateQueries({ queryKey: ['cart', sessionId] });
      qc.invalidateQueries({ queryKey: ['orders', sessionId] });
    };

    es.addEventListener('cart.updated', (e: MessageEvent) => {
      const p = JSON.parse(e.data) as { version: number; items: CartDto['items']; total: number };
      qc.setQueryData<CartDto>(['cart', sessionId], { sessionId, version: p.version, items: p.items, total: p.total });
    });
    es.addEventListener('cart.cleared', (e: MessageEvent) => {
      const p = JSON.parse(e.data) as { version: number };
      qc.setQueryData<CartDto>(['cart', sessionId], { sessionId, version: p.version, items: [], total: 0 });
    });
    es.addEventListener('order.created', (e: MessageEvent) => {
      const p = JSON.parse(e.data) as { order: OrderDto };
      qc.setQueryData<OrderDto[]>(['orders', sessionId], (old) => [p.order, ...(old ?? [])]);
    });
    es.addEventListener('order.deleted', (e: MessageEvent) => {
      const p = JSON.parse(e.data) as { orderId: string };
      qc.setQueryData<OrderDto[]>(['orders', sessionId], (old) => (old ?? []).filter((o) => o.id !== p.orderId));
    });
    es.addEventListener('menu.soldout.changed', () => {
      qc.invalidateQueries({ queryKey: ['menu'] });
    });
    es.addEventListener('session.closed', () => {
      es.close();
      clearSession();
      onSessionClosed?.();
    });

    return () => es.close();
  }, [sessionId, qc, onSessionClosed]);
}
