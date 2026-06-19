import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useStoreSseChannel(storeId: string | null, onNewOrder?: () => void): void {
  const qc = useQueryClient();
  useEffect(() => {
    if (!storeId) return;
    const es = new EventSource(`/sse/stores/${storeId}`);
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
