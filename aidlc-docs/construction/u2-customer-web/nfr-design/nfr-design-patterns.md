# U2 Customer Web — NFR Design Patterns (v2.2)

> **Stage**: CONSTRUCTION · U2 · NFR Design Step 6 산출물 (1/2)

본 문서는 U2의 NestJS·React 구현 패턴 코드 스니펫을 정의한다. 인프라 컴포넌트는 [`logical-components.md`](logical-components.md).

---

## 1. useSseChannel 훅 패턴

```ts
// hooks/useSseChannel.ts
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { SessionSseEvent } from '@table-order/shared';

export function useSseChannel(sessionId: string | null, token: string | null) {
  const qc = useQueryClient();
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!sessionId || !token) return;
    const url = `/sse/sessions/${sessionId}?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => {
      qc.invalidateQueries({ queryKey: ['cart', sessionId] });
      qc.invalidateQueries({ queryKey: ['orders', sessionId] });
    };

    es.addEventListener('cart.updated', (e: MessageEvent) => {
      const payload = JSON.parse(e.data) as Extract<SessionSseEvent, { type: 'cart.updated' }>;
      qc.setQueryData(['cart', sessionId], { sessionId, version: payload.version, items: payload.items, total: payload.total });
    });
    es.addEventListener('cart.cleared', (e: MessageEvent) => {
      const payload = JSON.parse(e.data) as Extract<SessionSseEvent, { type: 'cart.cleared' }>;
      qc.setQueryData(['cart', sessionId], { sessionId, version: payload.version, items: [], total: 0 });
    });
    es.addEventListener('order.created', (e: MessageEvent) => {
      const payload = JSON.parse(e.data) as Extract<SessionSseEvent, { type: 'order.created' }>;
      qc.setQueryData(['orders', sessionId], (old: any) => [payload.order, ...(old ?? [])]);
    });
    es.addEventListener('order.deleted', (e: MessageEvent) => {
      const payload = JSON.parse(e.data) as Extract<SessionSseEvent, { type: 'order.deleted' }>;
      qc.setQueryData(['orders', sessionId], (old: any[] | undefined) => old?.filter((o) => o.id !== payload.orderId) ?? []);
    });
    es.addEventListener('menu.soldout.changed', () => {
      qc.invalidateQueries({ queryKey: ['menu'] });
    });
    es.addEventListener('session.closed', () => {
      es.close();
      // 페이지 측에서 useSessionToken.clear() + navigate('/error/session-ended') 핸들링
      window.dispatchEvent(new CustomEvent('session-closed'));
    });

    return () => es.close();
  }, [sessionId, token, qc]);
}
```

> 메모: NestJS `@Sse()`는 URL query token을 가드에서 직접 추출하지 않으므로, 백엔드에서 `EventSource`용 query 토큰 지원이 필요. 임시 해결: SSE controller에서 `req.query.token`을 헤더처럼 처리하는 보조 가드 또는 cookie 기반. PoC 단순화로 `EventSourcePolyfill` (헤더 지원) 사용도 옵션.

## 2. API client 패턴

```ts
// api/client.ts
import { getSessionToken, clearSession } from '../hooks/useSessionToken';

export class ApiError extends Error {
  constructor(public statusCode: number, public errorCode: string, message: string, public details?: unknown) {
    super(message);
  }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getSessionToken();
  const res = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'X-Session-Token': token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    clearSession();
    window.location.href = '/error/session-ended';
    throw new ApiError(401, 'UNAUTHENTICATED', '세션이 만료되었습니다.');
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, data.errorCode ?? 'ERROR', data.message ?? '오류가 발생했어요.', data.details);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => call<T>('GET', path),
  post: <T>(path: string, body?: unknown) => call<T>('POST', path, body),
  patch: <T>(path: string, body?: unknown) => call<T>('PATCH', path, body),
  del: <T>(path: string) => call<T>('DELETE', path),
};
```

## 3. localStorage 훅 패턴

```ts
// hooks/useSessionToken.ts
const KEYS = {
  token: 'tableOrder.sessionToken',
  sid: 'tableOrder.sessionId',
  storeId: 'tableOrder.storeId',
  storeName: 'tableOrder.storeName',
  tableNumber: 'tableOrder.tableNumber',
};

export function getSessionToken(): string | null {
  return localStorage.getItem(KEYS.token);
}
export function getSessionId(): string | null {
  return localStorage.getItem(KEYS.sid);
}
export function setSession(data: { sessionToken: string; sessionId: string; storeId: string; storeName: string; tableNumber: number }): void {
  localStorage.setItem(KEYS.token, data.sessionToken);
  localStorage.setItem(KEYS.sid, data.sessionId);
  localStorage.setItem(KEYS.storeId, data.storeId);
  localStorage.setItem(KEYS.storeName, data.storeName);
  localStorage.setItem(KEYS.tableNumber, String(data.tableNumber));
}
export function clearSession(): void {
  for (const k of Object.values(KEYS)) localStorage.removeItem(k);
  localStorage.removeItem('tableOrder.help.completedAt');
}

export function useSessionToken() {
  return {
    token: getSessionToken(),
    sessionId: getSessionId(),
    storeId: localStorage.getItem(KEYS.storeId),
    storeName: localStorage.getItem(KEYS.storeName),
    tableNumber: Number(localStorage.getItem(KEYS.tableNumber) ?? 0),
    setSession,
    clear: clearSession,
  };
}
```

## 4. a11y 패턴

```ts
// hooks/useAccessibility.tsx
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const Ctx = createContext<{
  largeText: boolean; highContrast: boolean;
  toggleLargeText: () => void; toggleHighContrast: () => void;
} | null>(null);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [largeText, setLT] = useState(() => localStorage.getItem('tableOrder.a11y.largeText') === '1');
  const [highContrast, setHC] = useState(() => localStorage.getItem('tableOrder.a11y.highContrast') === '1');

  useEffect(() => {
    document.documentElement.classList.toggle('large-text', largeText);
    localStorage.setItem('tableOrder.a11y.largeText', largeText ? '1' : '');
  }, [largeText]);

  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', highContrast);
    localStorage.setItem('tableOrder.a11y.highContrast', highContrast ? '1' : '');
  }, [highContrast]);

  const toggleLargeText = useCallback(() => setLT((v) => !v), []);
  const toggleHighContrast = useCallback(() => setHC((v) => !v), []);

  return <Ctx.Provider value={{ largeText, highContrast, toggleLargeText, toggleHighContrast }}>{children}</Ctx.Provider>;
}

export function useAccessibility() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAccessibility within AccessibilityProvider');
  return ctx;
}
```

## 5. TanStack Query 훅 패턴

```ts
// hooks/useCartQuery.ts
export function useCartQuery(sessionId: string | null) {
  return useQuery({
    queryKey: ['cart', sessionId],
    queryFn: () => api.get<CartDto>(`/sessions/${sessionId}/cart`),
    enabled: !!sessionId,
    staleTime: 30_000,
  });
}

// hooks/useCartMutation.ts
export function useCartMutation(sessionId: string) {
  const qc = useQueryClient();
  const onSuccess = (dto: CartDto) => qc.setQueryData(['cart', sessionId], dto);
  return {
    add: useMutation({ mutationFn: (dto: AddCartItemDto) => api.post<CartDto>(`/sessions/${sessionId}/cart/items`, dto), onSuccess }),
    update: useMutation({ mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      api.patch<CartDto>(`/sessions/${sessionId}/cart/items/${itemId}`, { quantity }), onSuccess }),
    remove: useMutation({ mutationFn: (itemId: string) => api.del<CartDto>(`/sessions/${sessionId}/cart/items/${itemId}`), onSuccess }),
    clear: useMutation({ mutationFn: () => api.del<CartDto>(`/sessions/${sessionId}/cart`), onSuccess }),
  };
}
```

## 6. 라우팅 가드

```tsx
// routes/RequireSession.tsx
export function RequireSession({ children }: { children: React.ReactElement }) {
  const { token, sessionId } = useSessionToken();
  if (!token || !sessionId) return <Navigate to="/error/no-session" replace />;
  return children;
}
```

## 7. NFR ↔ 패턴 매핑

| NFR | 적용 위치 |
|-----|-----------|
| NFR-1·6 | §1 useSseChannel |
| NFR-4·11 | §4 a11y + CSS 변수 |
| NFR-5 | §3 localStorage 훅 (세션 토큰만) |
| NFR-10 | TanStack Query mock + MSW로 테스트 가능 구조 |
| CL-1·3 | §2 API client (헤더·errorCode) |
| CL-2 | §2 401 처리 |
| CL-8 | §1 onopen invalidateQueries |
