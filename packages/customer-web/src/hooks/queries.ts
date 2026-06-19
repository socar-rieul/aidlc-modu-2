import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AddCartItemDto,
  AdvertisementDto,
  CartDto,
  CreateOrderResponse,
  MenuDto,
  OrderDto,
  UpdateCartItemDto,
} from '@table-order/shared';
import { api } from '../api/client';

export function useMenuQuery() {
  return useQuery({
    queryKey: ['menu'],
    queryFn: () => api.get<MenuDto[]>('/menus'),
    staleTime: 30_000,
  });
}

export function useAdsQuery(slot: 'menu_top' | 'menu_bottom' | 'cart_bottom') {
  return useQuery({
    queryKey: ['ads', slot],
    queryFn: () => api.get<AdvertisementDto[]>(`/ads?slot=${slot}`),
    staleTime: 60_000,
  });
}

export function useCartQuery(sessionId: string | null) {
  return useQuery({
    queryKey: ['cart', sessionId],
    queryFn: () => api.get<CartDto>(`/sessions/${sessionId}/cart`),
    enabled: !!sessionId,
    staleTime: 30_000,
  });
}

export function useCartMutations(sessionId: string) {
  const qc = useQueryClient();
  const onSuccess = (dto: CartDto) => qc.setQueryData(['cart', sessionId], dto);
  return {
    add: useMutation({
      mutationFn: (dto: AddCartItemDto) => api.post<CartDto>(`/sessions/${sessionId}/cart/items`, dto),
      onSuccess,
    }),
    update: useMutation({
      mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
        api.patch<CartDto>(`/sessions/${sessionId}/cart/items/${itemId}`, { quantity } as UpdateCartItemDto),
      onSuccess,
    }),
    remove: useMutation({
      mutationFn: (itemId: string) => api.del<CartDto>(`/sessions/${sessionId}/cart/items/${itemId}`),
      onSuccess,
    }),
    clear: useMutation({
      mutationFn: () => api.del<CartDto>(`/sessions/${sessionId}/cart`),
      onSuccess,
    }),
  };
}

export function useOrdersQuery(sessionId: string | null) {
  return useQuery({
    queryKey: ['orders', sessionId],
    queryFn: () => api.get<OrderDto[]>(`/sessions/${sessionId}/orders`),
    enabled: !!sessionId,
    staleTime: 30_000,
  });
}

export function useConfirmOrder(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<CreateOrderResponse>(`/sessions/${sessionId}/orders`),
    onSuccess: (data) => {
      qc.setQueryData(['cart', sessionId], data.cart);
      qc.invalidateQueries({ queryKey: ['orders', sessionId] });
    },
  });
}
