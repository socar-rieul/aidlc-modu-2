# U1 Backend — Business Logic Model (v2.2)

> **Stage**: CONSTRUCTION · U1 Backend · Functional Design Step 6 산출물 (1/3)
> **Inputs**: [`u1-backend-functional-design-plan.md`](../../plans/u1-backend-functional-design-plan.md) · [`services.md`](../../../inception/application-design/services.md) · [`component-dependency.md`](../../../inception/application-design/component-dependency.md) · [`stories.md` v2.2](../../../inception/user-stories/stories.md)

본 문서는 U1 Backend의 **핵심 use-case 워크플로우의 데이터 변환·트랜잭션 경계·SSE 발화 시점**을 G/W/T 수준으로 구체화한다. 기술-무관(technology-agnostic) — TypeORM·NestJS 구현 디테일은 Code Generation 단계 산출.

상호 참조:
- 도메인 룰 카탈로그·HTTP 에러 코드 매핑: [`business-rules.md`](business-rules.md)
- 엔티티 상세·라이프사이클: [`domain-entities.md`](domain-entities.md)

---

## 1. Use-Case 카탈로그 (8개)

Application Design `services.md §2`의 5 use-case + Functional Design 단계에서 추가 정의한 3 use-case.

| # | Use-case | 1차 트리거 | 핵심 도메인 | 커버 스토리 |
|---|----------|------------|--------------|-------------|
| UC-1 | 고객 QR 스캔 입장 (첫 스캔 시 세션·Cart 동시 생성) | POST `/qr/scan/:token` | Table·Session·Cart·SSE | US-C1.1 |
| UC-2 | 공동 장바구니 변경 (추가·수정·삭제·비우기) | POST/PATCH/DELETE `/cart/*` | Cart·Menu·SSE | US-C3.1, C3.2, C3.4 |
| UC-3 | 주문 확정 (Cart→Order 스냅샷) | POST `/sessions/:sid/orders` | Order·Cart·Menu·Table·SSE | US-C4.1, C4.2 |
| UC-4 | 관리자 세션 종료 + 토큰 일괄 무효화 | POST `/admin/tables/:id/session/close` | Table·Order·Cart·Session·SSE | US-A3.3 |
| UC-5 | 메뉴 품절 토글 → 활성 세션 전체 fan-out | PATCH `/admin/menus/:id/soldout` | Menu·Session·SSE | US-A4.4 |
| UC-6 | QR 재발급 = 활성 세션 강제 종료 + 신규 qrToken 발급 (Q2 답변) | POST `/admin/tables/:id/qr/regenerate` | Table·Session(closeActiveSession cascade) | US-A3.1 |
| UC-7 | 관리자 주문 직권 삭제 (활성 세션만, Q3 답변) | DELETE `/admin/orders/:id` | Order·Table·SSE | US-A3.2 |
| UC-8 | 메뉴 삭제 with 카트 충돌 검사 (v2.2 정합성) | DELETE `/admin/menus/:id` | Menu·Cart (read) | US-A4.2 |

---

## 2. UC-1 — 고객 QR 스캔 입장

### 2.1 워크플로우 (G/W/T)

```gherkin
Given 손님 본인 폰이 테이블 영구 QR 토큰을 들고 POST /qr/scan/:token 호출
When TableService.scanQr(token, optionalExistingSessionToken)
Then
  1. Table을 qrToken으로 조회
     - 없으면 → 400 + errorCode: QR_REVOKED (NestJS 표준 404 대신 errorCode 단순화)
  2. Store.active 확인
     - false면 → 400 + errorCode: STORE_CLOSED
  3. 트랜잭션 시작
     a. 활성 TableSession 조회 (status=ACTIVE, tableId 기준 unique)
        - 없으면(첫 스캔):
          * TableSession INSERT (status=ACTIVE, startedAt=now)
          * Cart INSERT (sessionId 동일, version=0, updatedAt=now)
          * sessionCreated = true
        - 있으면(후속 스캔): 동일 sessionId 재사용, sessionCreated = false
     b. existingSessionToken 검증 (재진입):
        - 동일 sessionId·revokedAt 미설정이면 idempotent — 새 토큰 발급 안 함
        - 아니면 신규 SessionParticipant INSERT (token=UUIDv4, joinedAt=now)
     c. COMMIT
  4. sessionCreated=true이면 SseService.emitToStore({ type: 'session.started', tableId, sessionId, startedAt })
  5. 응답: { sessionToken, sessionId, storeId, storeName, tableNumber }
```

### 2.2 데이터 변환

| 입력 | 출력 |
|------|------|
| `{ token: string, X-Session-Token?: string }` | `QrScanResponse { sessionToken, sessionId, storeId, storeName, tableNumber }` |

### 2.3 SSE 발화

- 매장 채널만: `session.started` (sessionCreated=true 때만)
- 세션 채널 없음 (참가자 가시화 UI 제거 — v2.1)

### 2.4 에러 케이스

| 상황 | 응답 |
|------|------|
| 토큰 미존재·무효 | 400 + `QR_REVOKED` |
| 매장 영업 종료 | 400 + `STORE_CLOSED` |
| 이미 무효화된 기존 세션 토큰 제출 | 무시 (idempotent로 신규 발급) |

---

## 3. UC-2 — 공동 장바구니 변경

### 3.1 워크플로우 (G/W/T) — 추가 시나리오

```gherkin
Given 참가자가 POST /sessions/:sid/cart/items { menuId, quantity } 호출 + QrTokenGuard·SessionScopeGuard 통과
When CartService.addItem(sid, dto)
Then
  1. MenuService.assertNotSoldout(menuId)
     - soldout=true → 400 + errorCode: MENU_SOLDOUT
  2. 트랜잭션
     a. SELECT Cart WHERE sessionId=sid FOR UPDATE (row lock — last-write-wins 직렬화)
     b. UPSERT CartItem (PK = cartSessionId + menuId) — quantity += 입력 quantity
     c. UPDATE Cart SET version = version + 1, updatedAt = now
     d. COMMIT
  3. SELECT Cart + CartItem[] (재계산 total)
  4. SseService.emitToSession(sid, { type: 'cart.updated', version, items, total })
  5. 응답: CartDto (요청자 본인도 즉시 화면 갱신 가능)
```

수정·삭제 시나리오는 동일 패턴 (단 UPSERT 대신 UPDATE/DELETE). 비우기는 CartItem 일괄 DELETE + `cart.cleared` 발화.

### 3.2 동시성 (CR-6 last-write-wins)

- 두 참가자가 동시에 같은 menuId 추가 → 둘 다 SELECT FOR UPDATE에서 직렬화 → 첫 commit이 version=N, 두 번째가 N+1.
- SSE는 commit 순서대로 발화. 클라이언트는 version 단조 증가로 idempotent 판정.

### 3.3 에러 케이스

| 상황 | 응답 |
|------|------|
| 메뉴 품절 | 400 + `MENU_SOLDOUT` |
| 세션 종료됨 (status=CLOSED) | 401 (SessionScopeGuard에서 revoked 감지) |
| quantity ≤ 0 | 400 (class-validator) |

---

## 4. UC-3 — 주문 확정 (Cart→Order 스냅샷)

### 4.1 워크플로우 (G/W/T)

```gherkin
Given 참가자가 POST /sessions/:sid/orders 호출
When OrderService.createOrder(sid)
Then
  1. 트랜잭션
     a. SELECT TableSession WHERE id=sid FOR UPDATE (status=ACTIVE 확인)
        - status=CLOSED이면 → 401 SessionScopeGuard에서 이미 차단됨
     b. SELECT Cart + CartItem[] FOR UPDATE
        - items 비어있으면 → 400 + errorCode: CART_EMPTY
     c. for each item:
        - MenuService.assertNotSoldout(menuId)
          * soldout=true → 400 + errorCode: CART_HAS_DELETED_MENU (혹은 MENU_SOLDOUT — 일관성)
        - Menu.name·price 조회 (스냅샷 용)
     d. Order INSERT (sessionId, total=Σ(unitPrice × quantity), createdAt=now)
     e. OrderItem[] INSERT (orderId, menuId, menuNameSnapshot, unitPriceSnapshot, quantity)  [CR-4]
     f. CartItem DELETE WHERE cartSessionId=sid (Cart clear)
     g. UPDATE Cart SET version = version + 1
     h. COMMIT
  2. SseService.emitToSession(sid, [{ type: 'cart.cleared', version }, { type: 'order.created', order }])
  3. SseService.emitToStore(storeId, { type: 'order.created', tableId, sessionId, order })
  4. 응답: { order, cart: clearedCart }
```

### 4.2 v2.2 정합성 — session.started 발화 안 함

세션은 UC-1(첫 스캔 시) 이미 생성되었으므로 주문 확정 시점에 `session.started`를 별도 발화하지 않는다. (v2.0 모델에서 변경됨.)

### 4.3 에러 케이스

| 상황 | 응답 |
|------|------|
| 빈 카트 | 400 + `CART_EMPTY` |
| 카트에 품절 메뉴 포함 | 400 + `MENU_SOLDOUT` 또는 `CART_HAS_DELETED_MENU` |
| 세션 종료됨 | 401 (가드) |

---

## 5. UC-4 — 관리자 세션 종료 + 토큰 일괄 무효화

### 5.1 워크플로우 (G/W/T)

```gherkin
Given 관리자가 POST /admin/tables/:id/session/close 호출 (JwtAuthGuard·StoreScopeGuard 통과)
When TableService.closeActiveSession(storeId, tableId)
Then
  1. 트랜잭션
     a. SELECT TableSession WHERE tableId=:id AND status=ACTIVE FOR UPDATE
        - 없음 → 400 + errorCode: SESSION_INACTIVE
     b. SELECT COUNT(Order) WHERE sessionId AND deletedAt IS NULL → orderCount
     c. UPDATE TableSession SET status=CLOSED, endedAt=now
     d. **v2.2 분기**:
        - orderCount > 0:
          * OrderHistory INSERT (tableId, originalSessionId, closedAt=now, summary={ orders: [...], total })
          * Order 보존(soft-link via originalSessionId) — Order 행 자체는 유지(deletedAt NULL).
          * movedOrders = orderCount
        - orderCount == 0 (빈 세션):
          * OrderHistory 미생성 (v2.2 정합성)
          * movedOrders = 0
     e. CartItem DELETE + Cart 행은 유지하되 version+1, updatedAt=now (또는 Cart 자체 DELETE — 구현 선택, 도메인 모델은 동일)
     f. UPDATE SessionParticipant SET revokedAt=now WHERE sessionId=:sid
     g. COMMIT
  2. SseService.emitToSession(sid, { type: 'session.closed', reason: 'admin-closed' })
  3. SseService.emitToStore(storeId, { type: 'session.closed', tableId, sessionId, closedAt })
  4. 응답: { closedSessionId, movedOrders }
```

### 5.2 SSE 후 클라이언트 동작 (참조 — 책임은 U2)

- 세션 채널 구독자 모두 → 로컬 sessionToken 폐기 + 안내 화면("이용이 종료되었습니다") → 라우트 `/error/session-ended`.
- 매장 채널 구독자 → 테이블 카드 빈 상태로 전환.

---

## 6. UC-5 — 메뉴 품절 토글 → 활성 세션 fan-out

### 6.1 워크플로우 (G/W/T)

```gherkin
Given 관리자가 PATCH /admin/menus/:id/soldout { soldout: true } 호출
When MenuService.toggleSoldout(storeId, id, soldout)
Then
  1. SELECT Menu WHERE id AND storeId
     - 없음 → 404 또는 400+errorCode: MENU_NOT_FOUND
  2. UPDATE Menu SET soldout=:soldout
  3. SELECT TableSession.id WHERE table.storeId=:storeId AND status=ACTIVE → activeSessionIds[]
  4. for each sid in activeSessionIds:
       SseService.emitToSession(sid, { type: 'menu.soldout.changed', menuId, soldout })
  5. SseService.emitToStore(storeId, { type: 'menu.soldout.changed', menuId, soldout })  # 관리자 echo
  6. 응답: MenuDto
```

### 6.2 후속 영향

- **즉시 차단**: 메뉴 화면(US-C2.1) 회색 + "품절" 배지, "담기" 비활성. POST `/cart/items`는 UC-2 §3.3에서 거부.
- **카트에 이미 담긴 항목**: 클라이언트가 SSE 수신 시 빨간 배지 표시 (실제 차단은 다음 주문 확정 UC-3 §4.1에서).

---

## 7. UC-6 — QR 재발급 (Q2: 강제 종료)

### 7.1 워크플로우 (G/W/T)

```gherkin
Given 관리자가 POST /admin/tables/:id/qr/regenerate 호출
When TableService.regenerateQr(storeId, tableId)
Then
  1. SELECT Table WHERE id AND storeId
     - 없음 → 400 + errorCode: TABLE_NOT_FOUND
  2. **활성 세션 cascade 종료** (UC-4 closeActiveSession 호출):
     - 활성 세션이 있으면 위 §5의 1~3단계 cascade 전체 수행 + SSE `session.closed { reason: 'qr-revoked' }` 발화
     - 빈 세션이면 history 미기록 (v2.2)
     - 없으면 skip
  3. 트랜잭션
     a. UPDATE Table SET qrToken = UUIDv4()
     b. COMMIT
  4. QR 이미지·PDF 비동기 생성 (qrcode 라이브러리, base64)
  5. 응답: QrRegenerateResponse { qrToken, imageUrl, pdfUrl }
```

### 7.2 SSE

- UC-4 cascade로 발생하는 모든 SSE 그대로 (세션 채널 + 매장 채널). 별도 추가 이벤트 없음.

---

## 8. UC-7 — 관리자 주문 직권 삭제 (Q3: 활성 세션만)

### 8.1 워크플로우 (G/W/T)

```gherkin
Given 관리자가 DELETE /admin/orders/:id 호출
When OrderService.deleteByAdmin(storeId, orderId)
Then
  1. SELECT Order JOIN TableSession WHERE order.id=:id AND table.storeId=:storeId
     - Order 없음 → 400 + errorCode: ORDER_NOT_FOUND
     - TableSession.status=CLOSED → 400 + errorCode: ORDER_IN_HISTORY
  2. 트랜잭션
     a. UPDATE Order SET deletedAt=now (soft delete)
     b. COMMIT
  3. SseService.emitToSession(sessionId, { type: 'order.deleted', orderId })
  4. SseService.emitToStore(storeId, { type: 'order.deleted', tableId, sessionId, orderId })
  5. 응답: 204
```

### 8.2 OrderHistory 분기

- 활성 세션의 주문만 직권 삭제 가능.
- 이미 종료된 세션(=OrderHistory에 이미 summary로 기록됨)의 변경은 차단 (정산 무결성 — Q3 답변).

---

## 9. UC-8 — 메뉴 삭제 with 카트 충돌 (v2.2 정합성)

### 9.1 워크플로우 (G/W/T)

```gherkin
Given 관리자가 DELETE /admin/menus/:id 호출
When MenuService.delete(storeId, id)
Then
  1. SELECT Menu WHERE id AND storeId — 없음 → 400 + MENU_NOT_FOUND
  2. SELECT COUNT(CartItem) WHERE menuId=:id JOIN Cart → cartCount
     - cartCount > 0 → 400 + errorCode: MENU_IN_CART
  3. 트랜잭션
     a. UPDATE Menu SET deletedAt=now (soft delete — OrderItem 스냅샷 CR-4 보호)
     b. COMMIT
  4. SseService.emitToStore(storeId, { type: 'menu.deleted', menuId })  # (옵션: 관리자 UI 동기화)
  5. 응답: 204
```

### 9.2 회피책

- 카트에 포함 시 → 손님에게 안내 후 카트 비우기 요청 또는 품절 토글로 임시 차단.

---

## 10. 도메인 이벤트 ↔ SSE 매핑 (참조 표)

`services.md §3.5`의 EventEmitter2 디커플링 패턴 그대로. 도메인 서비스는 `eventEmitter.emit(domainEvent)` → `SseService`가 `@OnEvent(...)` listener로 채널 라우팅.

| 도메인 이벤트 | 세션 채널 | 매장 채널 |
|---------------|:---------:|:--------:|
| `session.created` | — | `session.started` |
| `cart.changed` | `cart.updated` | — |
| `cart.emptied` | `cart.cleared` | — |
| `order.placed` | `order.created` | `order.created` |
| `order.removed` | `order.deleted` | `order.deleted` |
| `session.closed` | `session.closed` | `session.closed` |
| `menu.soldout` | `menu.soldout.changed` | `menu.soldout.changed` |
| `menu.deleted` | — | `menu.deleted` (옵션) |

---

## 11. 워크플로우 ↔ 스토리 Traceability

| Use-case | 1차 스토리 | 협력 스토리 |
|----------|-------------|-------------|
| UC-1 | US-C1.1 | — |
| UC-2 | US-C3.1, C3.2, C3.4 | US-A4.4 (soldout fan-out 수신 후 가시 표시) |
| UC-3 | US-C4.1, C4.2 | US-C5.1 (SSE 수신 갱신), US-A2.1 (매장 채널) |
| UC-4 | US-A3.3 | US-C5.1, US-C1.1 (재진입 신규 세션) |
| UC-5 | US-A4.4 | US-C2.1, C3.1 |
| UC-6 | US-A3.1 (마지막 시나리오) | UC-4 cascade |
| UC-7 | US-A3.2 | US-C5.1 (SSE 수신 갱신) |
| UC-8 | US-A4.2 (삭제 시나리오) | — |

---

## 12. 다음 산출물

- 도메인 룰 카탈로그·검증·HTTP 에러 매핑: [`business-rules.md`](business-rules.md)
- 13 엔티티 컬럼·제약·라이프사이클: [`domain-entities.md`](domain-entities.md)
