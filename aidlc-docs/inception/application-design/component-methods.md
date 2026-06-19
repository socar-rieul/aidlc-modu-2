# Component Methods — 테이블오더 서비스 (v2)

> **Stage**: INCEPTION · Application Design · Step 10 산출물 (2/4)
> **Inputs**: [`components.md`](components.md) · [`stories.md` v2](../user-stories/stories.md) · [`application-design-plan.md`](../plans/application-design-plan.md)

본 문서는 **메서드 시그니처 + REST endpoint 카탈로그 + SSE 이벤트 카탈로그**만 다룬다. 비즈니스 룰 디테일(예: "장바구니 추가 시 매장ID·세션 ID·메뉴 존재 여부 검증 → 트랜잭션 → 버전 +1 → SSE 발화")은 Functional Design (per-unit, CONSTRUCTION) 단계 산출.

표기 규약:
- TypeScript 시그니처. 입력·반환·throws만 표기.
- `[CR-#]`, `[NFR-#]`, `[US-#]` 는 cross-cutting 룰 / NFR / 스토리 참조.

---

## 1. REST Endpoint 카탈로그

### 1.1 고객용 (Customer Web ↔ Backend)

| Method | Path | DTO 입력 | DTO 응답 | 가드 | 관련 스토리 |
|--------|------|----------|----------|------|-------------|
| POST | `/qr/scan/:token` | — | `QrScanResponse { sessionToken, sessionId, storeName, tableNumber }` | (public) | US-C1.1 |
| GET | `/menus` | query `storeId` | `MenuDto[]` (category·soldout 포함) | `StoreScopeGuard` | US-C2.1 |
| GET | `/ads` | query `slot` | `AdvertisementDto[]` (active only) | (public) | US-C6.1 |
| GET | `/sessions/:sessionId/cart` | — | `CartDto { version, items[], total }` | `QrTokenGuard` + `SessionScopeGuard` | US-C3.3 |
| POST | `/sessions/:sessionId/cart/items` | `AddCartItemDto { menuId, quantity }` | `CartDto` (새 버전) | 동상 | US-C3.1 |
| PATCH | `/sessions/:sessionId/cart/items/:itemId` | `UpdateCartItemDto { quantity }` | `CartDto` | 동상 | US-C3.1 |
| DELETE | `/sessions/:sessionId/cart/items/:itemId` | — | `CartDto` | 동상 | US-C3.1 |
| DELETE | `/sessions/:sessionId/cart` | — | `CartDto` (빈 상태) | 동상 | US-C3.2 |
| GET | `/sessions/:sessionId/orders` | — | `OrderDto[]` (시간 역순) | 동상 | US-C5.1 |
| POST | `/sessions/:sessionId/orders` | — | `CreateOrderResponse { order, cart }` | 동상 | US-C4.1, C4.2 |
| GET | `/sse/sessions/:sessionId` | — | text/event-stream (SessionSseEvent) | `QrTokenGuard` + `SessionScopeGuard` | NFR-6 |

### 1.2 관리자용 (Admin Web ↔ Backend)

| Method | Path | DTO 입력 | DTO 응답 | 가드 | 관련 스토리 |
|--------|------|----------|----------|------|-------------|
| POST | `/admin/auth/login` | `LoginRequest { storeId, username, password }` | `LoginResponse { jwt, expiresAt }` | (public) + RateLimit (NFR-3) | US-A1.1, A1.3 |
| POST | `/admin/auth/logout` | — | 204 | `JwtAuthGuard` | (보조) |
| GET | `/admin/dashboard` | — | `DashboardDto { tables[], adsRead-only }` | `JwtAuthGuard` + `StoreScopeGuard` | US-A2.1~A2.3 |
| GET | `/admin/menus` | — | `MenuDto[]` | 동상 | US-A4.* |
| POST | `/admin/menus` | `CreateMenuDto` | `MenuDto` | 동상 | US-A4.1 |
| PATCH | `/admin/menus/:id` | `UpdateMenuDto` | `MenuDto` | 동상 | US-A4.2 |
| DELETE | `/admin/menus/:id` | — | 204 | 동상 | US-A4.2 |
| PATCH | `/admin/menus/sort` | `MenuSortDto { ids[] }` | `MenuDto[]` | 동상 | US-A4.3 |
| PATCH | `/admin/menus/:id/soldout` | `SoldoutToggleDto { soldout }` | `MenuDto` | 동상 | US-A4.4 |
| GET | `/admin/tables` | — | `TableDto[]` | 동상 | US-A3.* |
| POST | `/admin/tables` | `CreateTableDto { number }` | `TableDto` | 동상 | US-A3.1 |
| POST | `/admin/tables/:id/qr/regenerate` | — | `QrRegenerateResponse { qrToken, imageUrl, pdfUrl }` | 동상 | US-A3.1 |
| GET | `/admin/tables/:id/qr.pdf` | — | application/pdf | 동상 | US-A3.1 |
| POST | `/admin/tables/:id/session/close` | — | `{ closedSessionId, movedOrders }` | 동상 | US-A3.3 |
| DELETE | `/admin/orders/:id` | — | 204 | 동상 | US-A3.2 |
| GET | `/admin/history` | query `tableId, from, to` | `OrderHistoryDto[]` | 동상 | US-A3.4 |
| GET | `/sse/stores/:storeId` | — | text/event-stream (StoreSseEvent) | `JwtAuthGuard` + `StoreScopeGuard` | NFR-6 |

---

## 2. SSE Event 카탈로그

`packages/shared/src/sse-events/`에 union type으로 export.

### 2.1 세션 채널 (`SessionSseEvent`)

`/sse/sessions/:sessionId` 구독자는 본인 세션 변경만 받는다.

| Event | Payload | 발화 시점 |
|-------|---------|-----------|
| `cart.updated` | `{ version: number, items: CartItemDto[], total: number }` | CartItem 추가·수정·삭제 직후 (CR-6) |
| `cart.cleared` | `{ version: number }` | 전체 비우기 / 주문 확정 직후 (CR-6) |
| `order.created` | `{ order: OrderDto }` | POST `/sessions/:sessionId/orders` 성공 (CR-3) |
| `order.deleted` | `{ orderId: string }` | 관리자 직권 삭제 (US-A3.2 동기화) |
| `menu.soldout.changed` | `{ menuId: string, soldout: boolean }` | 관리자 품절 토글 (US-A4.4 → 활성 세션 전체) |
| `session.closed` | `{ reason: 'admin-closed' \| 'qr-revoked' }` | 세션 종료·QR 재발급 (CR-2) |

### 2.2 매장 채널 (`StoreSseEvent`)

`/sse/stores/:storeId` 구독자(관리자)는 매장 전체 변경을 받는다.

| Event | Payload | 발화 시점 |
|-------|---------|-----------|
| `session.started` | `{ tableId: string, sessionId: string, startedAt: string }` | 첫 주문 생성 시점 (CR-2 — 세션 자동 생성) |
| `order.created` | `{ tableId: string, sessionId: string, order: OrderDto }` | 동상 |
| `order.deleted` | `{ tableId: string, sessionId: string, orderId: string }` | 관리자 직권 삭제 |
| `session.closed` | `{ tableId: string, sessionId: string, closedAt: string }` | 세션 종료 |
| `menu.soldout.changed` | `{ menuId: string, soldout: boolean }` | 관리자 본인 액션의 echo (대시보드 동기화) |

---

## 3. Backend Service 메서드 시그니처

도메인별 모듈 내부 `*.service.ts`. **public method만 표기** (private helper 생략). 비즈니스 룰은 Functional Design에서.

### 3.1 AuthService (AuthModule)

```typescript
class AuthService {
  login(dto: LoginRequest): Promise<LoginResponse>;        // [CR-5] bcrypt 비교 + JWT 30일 + 시도 카운터 [NFR-3]
  validateJwt(token: string): Promise<JwtPayload>;          // 가드에서 호출
  logout(jwt: string): Promise<void>;                        // 토큰 무효화(in-memory blacklist)
}
```

### 3.2 TableService (TableModule)

```typescript
class TableService {
  scanQr(qrToken: string): Promise<QrScanResponse>;          // [CR-5] [US-C1.1] — 토큰 검증 + 참가자 토큰 발급
  createTable(storeId: string, dto: CreateTableDto): Promise<TableDto>;  // [US-A3.1]
  regenerateQr(storeId: string, tableId: string): Promise<QrRegenerateResponse>; // 기존 활성 세션 토큰 일괄 무효화
  closeActiveSession(storeId: string, tableId: string): Promise<{ closedSessionId: string; movedOrders: number }>; // [US-A3.3] [CR-2]
  getOrCreateActiveSession(tableId: string): Promise<TableSession>;       // 주문 확정 시 OrderService가 호출 [CR-2]
  revokeAllParticipants(sessionId: string): Promise<void>;                // 세션 종료 시 cascade
  generateQrImage(qrToken: string, format: 'png'|'pdf'): Promise<Buffer>;
}
```

### 3.3 MenuService (MenuModule)

```typescript
class MenuService {
  listForCustomer(storeId: string): Promise<MenuDto[]>;             // soldout 포함, 정렬 적용
  listForAdmin(storeId: string): Promise<MenuDto[]>;
  create(storeId: string, dto: CreateMenuDto): Promise<MenuDto>;    // 가격 >=1원 검증 [US-A4.1]
  update(storeId: string, id: string, dto: UpdateMenuDto): Promise<MenuDto>; // soldout 플래그 보존 [US-A4.4]
  delete(storeId: string, id: string): Promise<void>;                // [CR-4] — 과거 스냅샷 보호 (실제 row 삭제)
  reorder(storeId: string, ids: string[]): Promise<MenuDto[]>;
  toggleSoldout(storeId: string, id: string, soldout: boolean): Promise<MenuDto>; // [US-A4.4] → SSE
  assertNotSoldout(menuId: string): Promise<void>;                  // CartService·OrderService가 호출
}
```

### 3.4 CartService (CartModule)

```typescript
class CartService {
  getCart(sessionId: string): Promise<CartDto>;                                                 // 빈 카트 자동 생성
  addItem(sessionId: string, dto: AddCartItemDto): Promise<CartDto>;                             // [CR-6] 버전 +1, [US-A4.4] soldout 거부
  updateItem(sessionId: string, itemId: string, dto: UpdateCartItemDto): Promise<CartDto>;       // 0이면 자동 제거
  removeItem(sessionId: string, itemId: string): Promise<CartDto>;
  clear(sessionId: string): Promise<CartDto>;                                                    // [US-C3.2]
  snapshotForOrder(sessionId: string): Promise<CartItemSnapshot[]>;                              // OrderService가 호출
}
```

### 3.5 OrderService (OrderModule)

```typescript
class OrderService {
  listForSession(sessionId: string): Promise<OrderDto[]>;                                        // 시간 역순 [US-C5.1]
  createOrder(sessionId: string): Promise<CreateOrderResponse>;                                  // [CR-2 세션 자동 생성] [CR-4 스냅샷] [US-C4.1]
  deleteByAdmin(storeId: string, orderId: string): Promise<void>;                                // [US-A3.2] → SSE session+store
  listHistory(storeId: string, query: HistoryQueryDto): Promise<OrderHistoryDto[]>;              // [US-A3.4]
  moveSessionOrdersToHistory(sessionId: string): Promise<{ movedOrders: number }>;               // TableService.closeSession 호출
}
```

### 3.6 SseService (SseModule)

```typescript
class SseService {
  subscribeSession(sessionId: string, participantToken: string): Observable<MessageEvent<SessionSseEvent>>;
  subscribeStore(storeId: string, jwt: string): Observable<MessageEvent<StoreSseEvent>>;
  emitToSession(sessionId: string, event: SessionSseEvent): void;        // 도메인 서비스가 호출
  emitToStore(storeId: string, event: StoreSseEvent): void;
}
```

내부적으로 `EventEmitter2`(NestJS) + `Subject` per channel 조합. keep-alive 주석 라인 주기적 발신 (NFR-1 ≤2초 + NFR-6).

### 3.7 AdminDashboardService (AdminModule)

```typescript
class AdminDashboardService {
  getDashboard(storeId: string): Promise<DashboardDto>;            // Table[] + 활성 세션·주문 집계 (read-only orchestration)
}
```

### 3.8 AdsService (AdsModule)

```typescript
class AdsService {
  listActive(slot?: AdSlot): Promise<AdvertisementDto[]>;          // [US-C6.1] 시드 데이터 read
}
```

---

## 4. Frontend Hook 시그니처 (Customer / Admin 공통 패턴)

### 4.1 useSseChannel (양쪽 공통)

```typescript
function useSseChannel<E extends { type: string }>(
  url: string,
  handlers: { [K in E['type']]?: (event: Extract<E, { type: K }>) => void }
): { connected: boolean; reconnectCount: number };
// 내부: EventSource + 자동 재연결 + queryClient.setQueryData 갱신
```

### 4.2 Customer (예시)

```typescript
function useSessionToken(): { sessionId: string | null; participantToken: string | null; clear(): void };
function useMenuQuery(storeId: string): UseQueryResult<MenuDto[]>;
function useCartQuery(sessionId: string): UseQueryResult<CartDto>;
function useCartMutation(sessionId: string): {
  add: UseMutationResult<CartDto, Error, AddCartItemDto>;
  update: UseMutationResult<CartDto, Error, { itemId: string; quantity: number }>;
  remove: UseMutationResult<CartDto, Error, string>;
  clear: UseMutationResult<CartDto, Error, void>;
};
function useOrdersQuery(sessionId: string): UseQueryResult<OrderDto[]>;
function useConfirmOrder(sessionId: string): UseMutationResult<CreateOrderResponse, Error, void>;
function useAccessibility(): { largeText: boolean; highContrast: boolean; toggleLargeText(): void; toggleHighContrast(): void };
```

### 4.3 Admin (예시)

```typescript
function useAdminAuth(): { jwt: string | null; expiresAt: Date | null; login(dto: LoginRequest): Promise<void>; logout(): void };
function useDashboardQuery(): UseQueryResult<DashboardDto>;
function useMenusQuery(): UseQueryResult<MenuDto[]>;
function useToggleSoldout(): UseMutationResult<MenuDto, Error, { id: string; soldout: boolean }>;
function useTablesQuery(): UseQueryResult<TableDto[]>;
function useRegenerateQr(): UseMutationResult<QrRegenerateResponse, Error, string>;
function useCloseSession(): UseMutationResult<unknown, Error, string>;
function useDeleteOrder(): UseMutationResult<void, Error, string>;
function useHistoryQuery(query: HistoryQueryDto): UseQueryResult<OrderHistoryDto[]>;
```
