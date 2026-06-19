# U3 Admin Web — NFR Design Patterns (v2.2)

> **Stage**: CONSTRUCTION · U3 · NFR Design Step 6 산출물 (1/2)

---

## 1. useAdminAuth 패턴

```ts
// hooks/useAdminAuth.ts
const KEYS = { jwt: 'tableOrder.admin.jwt', exp: 'tableOrder.admin.expiresAt' };

export function getJwt(): string | null {
  const exp = localStorage.getItem(KEYS.exp);
  if (exp && new Date(exp) <= new Date()) {
    localStorage.removeItem(KEYS.jwt);
    localStorage.removeItem(KEYS.exp);
    return null;
  }
  return localStorage.getItem(KEYS.jwt);
}

export function setAuth(data: LoginResponse) {
  localStorage.setItem(KEYS.jwt, data.jwt);
  localStorage.setItem(KEYS.exp, data.expiresAt);
}

export function clearAuth() {
  localStorage.removeItem(KEYS.jwt);
  localStorage.removeItem(KEYS.exp);
}

export function decodeStoreId(jwt: string): string | null {
  try {
    const [, payload] = jwt.split('.');
    const body = JSON.parse(atob(payload));
    return body.storeId ?? null;
  } catch { return null; }
}

export function useAdminAuth() {
  const jwt = getJwt();
  return { jwt, storeId: jwt ? decodeStoreId(jwt) : null, setAuth, clearAuth };
}
```

## 2. API client 패턴

```ts
// api/client.ts
export class ApiError extends Error {
  constructor(public statusCode: number, public errorCode: string, message: string, public details?: unknown) { super(message); }
}

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const jwt = getJwt();
  const res = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    clearAuth();
    if (window.location.pathname !== '/login') window.location.href = '/login';
    throw new ApiError(401, 'UNAUTHENTICATED', '세션이 만료되었습니다.');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(res.status, (data as any).errorCode ?? `HTTP_${res.status}`, (data as any).message ?? '오류', (data as any).details);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
```

## 3. useStoreSseChannel

```ts
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
```

> 참고: `/sse/stores/:storeId`는 백엔드에서 `JwtAuthGuard`로 보호되지만 EventSource는 헤더를 못 보냄. 워크샵 PoC라 backend SSE 컨트롤러는 인증 가드를 우회하거나 token query 지원이 필요. 본 PoC에서는 storeId path만 이용해 현재 매장의 채널을 구독하는 단순화 사용 (production에서는 EventSourcePolyfill 또는 token query).

## 4. QR 다운로드

```ts
export function useQrDownload() {
  return useMutation({
    mutationFn: async ({ tableId, format }: { tableId: string; format: 'png' | 'svg' }) => {
      const jwt = getJwt();
      const res = await fetch(`/admin/tables/${tableId}/qr.${format}`, { headers: { Authorization: `Bearer ${jwt}` } });
      if (!res.ok) throw new ApiError(res.status, `HTTP_${res.status}`, '다운로드 실패');
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
```

## 5. Mutations 패턴

```ts
const { mutate: closeSession } = useMutation({
  mutationFn: (tableId: string) => api.post<{ closedSessionId: string; movedOrders: number }>(`/admin/tables/${tableId}/session/close`),
  onSuccess: (data) => {
    qc.invalidateQueries({ queryKey: ['dashboard'] });
    qc.invalidateQueries({ queryKey: ['tables'] });
    showInfo(data.movedOrders > 0 ? `주문 ${data.movedOrders}건이 정산 내역으로 이동됐어요.` : '활성 세션을 종료했어요.');
  },
});
```

## 6. NFR ↔ 패턴

| NFR | 적용 |
|-----|------|
| NFR-1·6 | §3 useStoreSseChannel |
| NFR-2·3 | §1 useAdminAuth + §2 API client 401 처리 |
| NFR-10 | §5 Mutations + TanStack Query mock |
| AL-7 | §4 QR 다운로드 |
