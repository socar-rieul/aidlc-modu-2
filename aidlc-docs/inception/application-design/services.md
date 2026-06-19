# Services — 테이블오더 서비스 (v2)

> **Stage**: INCEPTION · Application Design · Step 10 산출물 (3/4)
> **Inputs**: [`components.md`](components.md) · [`component-methods.md`](component-methods.md)

본 문서는 **서비스 레이어 오케스트레이션 + cross-cutting 정책**을 다룬다. NestJS 도메인 모듈의 service들이 어떻게 협력하는지, 가드/인터셉터/EventEmitter2가 어떤 정책으로 동작하는지가 핵심.

---

## 1. 서비스 분류 — Domain vs Application

| 분류 | 정의 | 예시 |
|------|------|------|
| **Domain Service** | 단일 도메인 내부 비즈니스 룰 처리, DB·EventEmitter 직접 호출 | MenuService, CartService, OrderService 일부, TableService 일부, AdsService |
| **Application Service** | 여러 도메인 service를 호출해 use-case를 조립하는 orchestration layer | OrderService.createOrder(), TableService.closeActiveSession(), AdminDashboardService.getDashboard() |
| **Cross-cutting** | DI 가드·인터셉터·EventEmitter wiring | CommonModule 가드 + SseService 이벤트 라우터 |

본 프로젝트는 NestJS 단일 service 클래스가 두 역할을 겸함 (오케스트레이션 분리는 PoC 단순화). 단 함수 단위로 분류해 의도를 명시한다.

---

## 2. 핵심 Use-Case 오케스트레이션

### 2.1 고객 QR 스캔 입장 (US-C1.1)

```text
HTTP POST /qr/scan/:token
└─ TableController.scanQr(token)
   └─ TableService.scanQr(token)             [Application]
      ├─ Table repository.findOneByQrToken(token)     # 토큰 검증, 미존재 → 404
      ├─ Store repository.assertActive(table.storeId) # 영업 종료 → 403
      ├─ SessionParticipant repository.create({ tableId, sessionId(=table의 active session, 없으면 null) })
      └─ return { sessionToken, sessionId, storeName, tableNumber }
```

- **세션 자동 생성 안 함** — 세션은 첫 주문 시점에 생성된다 (CR-2). 스캔 직후엔 sessionId = null 가능. 첫 주문 시 OrderService가 TableService.getOrCreateActiveSession() 호출.
- **SessionParticipant**는 스캔 시점 즉시 발급 (트랜잭션 1회). sessionId가 null이면 임시 placeholder, 첫 주문 시 실제 session에 bind.
- **SSE 발화 없음** — 참가자 가시화는 v2.1에서 제거 (US-C1.2 결번).

### 2.2 공동 장바구니 추가 (US-C3.1)

```text
HTTP POST /sessions/:sessionId/cart/items   { menuId, quantity }
└─ CartController.addItem
   └─ CartService.addItem(sessionId, dto)   [Application]
      ├─ QrTokenGuard → SessionScopeGuard 통과 (CR-1, CR-2)
      ├─ MenuService.assertNotSoldout(menuId)       # 품절 거부 (US-A4.4)
      ├─ DB transaction
      │  ├─ Cart find or create (initial version=0)
      │  ├─ CartItem upsert by (cartSessionId, menuId)
      │  └─ Cart.version += 1, updatedAt = now
      ├─ rebuild CartDto (items + total)
      ├─ SseService.emitToSession(sessionId, { type: 'cart.updated', version, items, total })  [NFR-1, NFR-6]
      └─ return CartDto
```

- **last-write-wins (CR-6)**: 동시 요청은 DB row lock(Cart row)으로 직렬화. 마지막 commit이 최종 version.
- **SSE 발화는 트랜잭션 commit 이후** (consistency over latency, NFR-12).

### 2.3 주문 확정 (US-C4.1) — 가장 복잡

```text
HTTP POST /sessions/:sessionId/orders
└─ OrderController.create
   └─ OrderService.createOrder(sessionId)   [Application — 4 도메인 협력]
      ├─ QrTokenGuard → SessionScopeGuard 통과
      ├─ DB transaction
      │  ├─ TableService.getOrCreateActiveSession(tableId)  # CR-2 첫 주문 시 세션 생성
      │  │   └─ 세션이 새로 생성된 경우 sessionCreated=true 플래그 셋
      │  ├─ CartService.snapshotForOrder(sessionId)         # 현재 items + 단가 read (메뉴 price 스냅샷)
      │  ├─ MenuService.assertNotSoldout(menuId) × N        # 카트 내 모든 메뉴 재검증
      │  ├─ Order + OrderItem[] insert (CR-4 스냅샷 — menuName, unitPrice 복사)
      │  ├─ CartService.clear(sessionId) (Cart.version += 1)
      │  └─ commit
      ├─ SseService.emitToSession(sessionId, [
      │    { type: 'cart.cleared', version },
      │    { type: 'order.created', order }
      │  ])  [CR-3, NFR-1]
      ├─ SseService.emitToStore(storeId, [
      │    sessionCreated ? { type: 'session.started', tableId, sessionId, startedAt } : null,
      │    { type: 'order.created', tableId, sessionId, order }
      │  ])
      └─ return { order, cart: clearedCart }
```

### 2.4 관리자 세션 종료 (US-A3.3) — CR-2 전체 cascade

```text
HTTP POST /admin/tables/:id/session/close
└─ AdminTableController.closeSession
   └─ TableService.closeActiveSession(storeId, tableId)   [Application — 3 도메인 협력]
      ├─ JwtAuthGuard + StoreScopeGuard 통과
      ├─ DB transaction
      │  ├─ TableSession.status = 'CLOSED', endedAt = now
      │  ├─ OrderService.moveSessionOrdersToHistory(sessionId) → OrderHistory insert + Order soft-delete
      │  ├─ CartService.clear(sessionId)
      │  └─ TableService.revokeAllParticipants(sessionId)  # SessionParticipant.revokedAt = now
      ├─ SseService.emitToSession(sessionId, { type: 'session.closed', reason: 'admin-closed' })
      │     # → 모든 참가자 폰 EventSource 수신 → 클라이언트 로컬 세션 토큰 폐기 + "이용이 종료되었습니다" 안내
      ├─ SseService.emitToStore(storeId, { type: 'session.closed', tableId, sessionId, closedAt })
      └─ return { closedSessionId, movedOrders }
```

### 2.5 메뉴 품절 토글 (US-A4.4) — 모든 활성 세션 전파

```text
HTTP PATCH /admin/menus/:id/soldout   { soldout: true }
└─ AdminMenuController.toggleSoldout
   └─ MenuService.toggleSoldout(storeId, id, soldout)   [Application]
      ├─ Menu.soldout 업데이트
      ├─ 매장 활성 TableSession 목록 조회
      ├─ for each sessionId:
      │     SseService.emitToSession(sessionId, { type: 'menu.soldout.changed', menuId, soldout })
      ├─ SseService.emitToStore(storeId, { type: 'menu.soldout.changed', menuId, soldout })  # 관리자 자신 echo
      └─ return MenuDto
```

- 카트에 이미 담긴 항목은 클라이언트가 SSE 수신 시 시각 표시(빨간 배지)만 띄움. 실제 차단은 다음 주문 확정 시점에 MenuService.assertNotSoldout으로 거부.

---

## 3. Cross-cutting 정책

### 3.1 인증·가드 체인

| 가드 | 적용 대상 | 역할 |
|------|-----------|------|
| `JwtAuthGuard` | `/admin/**` | JWT 검증 + `request.user = { storeId, userId }` 주입. 만료 시 401. (NFR-2 30일) |
| `RateLimitGuard` | POST `/admin/auth/login` | IP·매장ID 조합 5회 실패 후 일시 차단. (US-A1.3, NFR-3) |
| `QrTokenGuard` | `/sessions/**`, `/sse/sessions/**` | 헤더 `X-Session-Token` 검증 → `SessionParticipant` 조회 → revoked 거부 → `request.session = { sessionId, tableId, storeId }` 주입. |
| `StoreScopeGuard` | `/admin/**`, `/menus`, `/ads`, `/sse/stores/**` | `request.user.storeId` 또는 query/path의 storeId가 일치하는지 강제. **타 매장 데이터 접근 차단 (CR-1).** |
| `SessionScopeGuard` | `/sessions/:sessionId/**` | path `:sessionId` ↔ `request.session.sessionId` 일치 강제. **타 세션 접근 차단 (CR-1·CR-2).** |

**Guard 적용 순서**: 인증(`JwtAuthGuard` or `QrTokenGuard`) → 스코프(`StoreScopeGuard` / `SessionScopeGuard`) → RateLimit(엔드포인트별). NestJS `@UseGuards()` 데코레이터 + 글로벌 가드(`APP_GUARD` provider) 조합으로 강제.

### 3.2 트랜잭션 정책

- **장바구니·주문은 항상 DB transaction 안에서 처리** (CartService.addItem, OrderService.createOrder, TableService.closeActiveSession).
- TypeORM `DataSource.transaction(async manager => …)` 패턴. service 메서드가 manager를 인자로 받아 nested call 가능.
- **SSE 발화는 트랜잭션 commit 직후** (rollback 시 발화 안 함 — consistency).

### 3.3 SSE 채널 라우팅

- `SseModule`이 채널 레지스트리(`Map<channelKey, Subject>`)를 보유. channelKey = `session:{sessionId}` or `store:{storeId}`.
- 구독 시 `Subject.subscribe` → unsubscribe는 클라이언트 연결 종료 hook(NestJS `Subscription.add(() => close)`).
- **Keep-alive**: 15초마다 `: keep-alive\n\n` 코멘트 라인 발신 (브라우저·프록시 idle 종료 방지).
- **재연결**: 클라이언트는 `EventSource` 기본 재연결(3초 지수 백오프). 서버는 stateless이므로 추가 처리 없음. (단절 중 누락 이벤트는 클라이언트가 재연결 직후 `GET /sessions/:sessionId/cart` + `/orders` 호출로 reconcile — `useSseChannel` 훅에서 `onreconnect` 콜백으로 처리.)

### 3.4 예외·로그 인터셉터

- `HttpExceptionFilter`: NestJS `HttpException`을 표준 응답 형태(`{ statusCode, message, errorCode }`)로 직렬화.
- `LoggingInterceptor`: 모든 컨트롤러 호출 entry/exit + duration ms 로그 (워크샵 디버깅용).

### 3.5 EventEmitter2 wiring

- 도메인 서비스는 `SseService`만 직접 의존하지 않고, **NestJS `EventEmitter2`에 도메인 이벤트를 emit** → `SseService`가 listener로 받아 채널로 라우팅. 결합도 ↓.
- 예: `OrderService.createOrder` → `eventEmitter.emit('order.created', { sessionId, storeId, order })` → `@OnEvent('order.created') SseService.handleOrderCreated()`.

### 3.6 시드 데이터 부트스트랩

- `packages/backend/src/seed/`에 `seed.module.ts` + `seed.service.ts`.
- `npm run seed` (또는 `start:dev`의 onModuleInit fallback)에서 1회 실행:
  - Store 1개 (`데모 매장`)
  - StoreUser 2개 (점주·알바)
  - Table 5개 + QR 토큰
  - MenuCategory 3개 + Menu 12개 (요청·반찬·음료 등)
  - Advertisement 2개 (모두의주차장 배너 — `menu_top`, `cart_bottom`)

---

## 4. Frontend 서비스 레이어

### 4.1 Customer Web

- **`api/` 폴더**: fetch 래퍼 + shared DTO import. `X-Session-Token` 자동 부착.
- **`useSseChannel` 훅**: EventSource 인스턴스 1개 (세션당) + handler dispatch → `queryClient.setQueryData(['cart'], …)` / `queryClient.invalidateQueries(['orders'])` 등.
- **localStorage 정책 (NFR-5)**:
  - `sessionToken`, `sessionId`, `storeName`, `tableNumber` (QR 스캔 응답)
  - `accessibility.largeText`, `accessibility.highContrast` (US-C0.2)
  - `help.completedAt` (US-C0.1, 세션 종료 시 SSE로 초기화 신호 수신해도 OK)
- **에러 핸들링**: 401/403 → 로컬 세션 폐기 + `/error/no-session` 리다이렉트. 5xx → toast.

### 4.2 Admin Web

- **`api/` 폴더**: fetch 래퍼 + `Authorization: Bearer {jwt}` 자동 부착. 401 → JWT 폐기 + `/login` 리다이렉트.
- **`useSseChannel` 훅**: storeId 채널 1개 구독, dashboard / history 캐시 무효화 + 신규 주문 카드 강조 애니메이션 트리거.
- **localStorage**: `jwt`, `expiresAt`. 만료 임박 시(7일 전) refresh hint UI.

---

## 5. 서비스 ↔ 스토리 Traceability

| Use-case orchestration | 주요 서비스 | 커버 스토리 |
|------------------------|-------------|-------------|
| QR 스캔 입장 | TableService.scanQr | US-C1.1 |
| 메뉴 탐색 | MenuService.listForCustomer + AdsService.listActive | US-C2.1, C6.1 |
| 공동 장바구니 추가·수정·삭제·비우기·복원 | CartService.* + MenuService.assertNotSoldout + SseService | US-C3.1~C3.4 |
| 주문 확정·실패 | OrderService.createOrder (Table+Cart+Menu+Sse 협력) | US-C4.1, C4.2 |
| 테이블 내역 조회 | OrderService.listForSession | US-C5.1 |
| 광고 노출 | AdsService.listActive | US-C6.1 |
| 도움말·접근성 | (Frontend only) useAccessibility / HelpOverlay | US-C0.1, C0.2 |
| 관리자 로그인·세션·시도 제한 | AuthService.* | US-A1.1, A1.2, A1.3 |
| 대시보드 그리드 + SSE | AdminDashboardService + SseService.subscribeStore | US-A2.1~A2.3 |
| QR 발급·재발급 | TableService.createTable, regenerateQr, generateQrImage | US-A3.1 |
| 직권 삭제 | OrderService.deleteByAdmin + SseService 동기화 | US-A3.2 |
| 세션 종료 | TableService.closeActiveSession (4 도메인 협력) | US-A3.3 |
| 과거 내역 | OrderService.listHistory | US-A3.4 |
| 메뉴 CRUD·정렬 | MenuService.create/update/delete/reorder | US-A4.1~A4.3 |
| 품절 토글 | MenuService.toggleSoldout (활성 세션 전체 SSE 전파) | US-A4.4 |
