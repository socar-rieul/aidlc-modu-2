import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getJwt } from './useAdminAuth';

export function useStoreSseChannel(storeId: string | null, onNewOrder?: () => void): void {
  const qc = useQueryClient();
  useEffect(() => {
    if (!storeId) return;
    const jwt = getJwt();
    if (!jwt) return;
    // vite proxy 우회 + JWT를 query token으로 전달
    const es = new EventSource(`http://localhost:3000/sse/stores/${storeId}?token=${encodeURIComponent(jwt)}`);
    es.onopen = () => qc.invalidateQueries({ queryKey: ['dashboard'] });
    es.addEventListener('order.created', () => {
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      onNewOrder?.();
    });
    es.addEventListener('order.deleted', () => qc.invalidateQueries({ queryKey: ['dashboard'] }));
    es.addEventListener('session.started', () => qc.invalidateQueries({ queryKey: ['dashboard'] }));
    es.addEventListener('session.closed', () => qc.invalidateQueries({ queryKey: ['dashboard'] }));
    es.addEventListener('menu.soldout.changed', () => qc.invalidateQueries({ queryKey: ['menus'] }));
    return () => es.close();
  }, [storeId, qc, onNewOrder]);
}
