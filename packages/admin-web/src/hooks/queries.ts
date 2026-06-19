import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateMenuDto,
  CreateTableDto,
  DashboardDto,
  HistoryQueryDto,
  LoginRequest,
  LoginResponse,
  MenuDto,
  MenuSortDto,
  OrderHistoryDto,
  QrRegenerateResponse,
  SoldoutToggleDto,
  TableDto,
  UpdateMenuDto,
} from '@table-order/shared';
import { api, ApiError } from '../api/client';
import { getJwt } from './useAdminAuth';

export function useLogin() {
  return useMutation<LoginResponse, ApiError, LoginRequest>({
    mutationFn: (dto) => api.post<LoginResponse>('/admin/auth/login', dto),
  });
}

export function useDashboardQuery() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardDto>('/admin/dashboard'),
    staleTime: 30_000,
  });
}

export function useAdminMenusQuery() {
  return useQuery({
    queryKey: ['menus'],
    queryFn: () => api.get<MenuDto[]>('/admin/menus'),
    staleTime: 30_000,
  });
}

export function useMenuMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['menus'] });
  return {
    create: useMutation({ mutationFn: (dto: CreateMenuDto) => api.post<MenuDto>('/admin/menus', dto), onSuccess: invalidate }),
    update: useMutation({
      mutationFn: ({ id, dto }: { id: string; dto: UpdateMenuDto }) => api.patch<MenuDto>(`/admin/menus/${id}`, dto),
      onSuccess: invalidate,
    }),
    remove: useMutation({ mutationFn: (id: string) => api.del<void>(`/admin/menus/${id}`), onSuccess: invalidate }),
    sort: useMutation({ mutationFn: (dto: MenuSortDto) => api.patch<MenuDto[]>('/admin/menus/sort', dto), onSuccess: invalidate }),
    toggleSoldout: useMutation({
      mutationFn: ({ id, dto }: { id: string; dto: SoldoutToggleDto }) =>
        api.patch<MenuDto>(`/admin/menus/${id}/soldout`, dto),
      onSuccess: invalidate,
    }),
  };
}

export function useTablesQuery() {
  return useQuery({
    queryKey: ['tables'],
    queryFn: () => api.get<TableDto[]>('/admin/tables'),
    staleTime: 30_000,
  });
}

export function useTableMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['tables'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };
  return {
    create: useMutation({
      mutationFn: (dto: CreateTableDto) => api.post<TableDto>('/admin/tables', dto),
      onSuccess: invalidate,
    }),
    regenerateQr: useMutation({
      mutationFn: (id: string) => api.post<QrRegenerateResponse>(`/admin/tables/${id}/qr/regenerate`),
      onSuccess: invalidate,
    }),
    closeSession: useMutation({
      mutationFn: (id: string) =>
        api.post<{ closedSessionId: string; movedOrders: number }>(`/admin/tables/${id}/session/close`),
      onSuccess: invalidate,
    }),
  };
}

export function useHistoryQuery(query: HistoryQueryDto | null) {
  return useQuery({
    queryKey: ['history', query?.tableId, query?.from, query?.to],
    queryFn: () => {
      const q = new URLSearchParams();
      q.set('tableId', query!.tableId);
      if (query!.from) q.set('from', query!.from);
      if (query!.to) q.set('to', query!.to);
      return api.get<OrderHistoryDto[]>(`/admin/history?${q.toString()}`);
    },
    enabled: !!query?.tableId,
    staleTime: 0,
  });
}

export function useDeleteOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.del<void>(`/admin/orders/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboard'] }),
  });
}

export function useQrDownload() {
  return useMutation({
    mutationFn: async ({ tableId, format }: { tableId: string; format: 'png' | 'svg' }) => {
      const jwt = getJwt();
      const res = await fetch(`/admin/tables/${tableId}/qr.${format}`, {
        headers: jwt ? { Authorization: `Bearer ${jwt}` } : {},
      });
      if (!res.ok) throw new ApiError(res.status, `HTTP_${res.status}`, '다운로드에 실패했어요.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `table-${tableId}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
  });
}
