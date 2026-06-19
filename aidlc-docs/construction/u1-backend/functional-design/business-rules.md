# U1 Backend — Business Rules (v2.2)

> **Stage**: CONSTRUCTION · U1 Backend · Functional Design Step 6 산출물 (2/3)
> **Inputs**: [`business-logic-model.md`](business-logic-model.md) · [`stories.md` v2.2 §0 (CR-1~CR-7)](../../../inception/user-stories/stories.md) · [`services.md`](../../../inception/application-design/services.md) · u1-functional-design-plan Q1~Q3 답변

본 문서는 U1 Backend의 **cross-cutting + 도메인별 비즈니스 룰 + 검증 정책 + 통합 HTTP 에러 코드 카탈로그**를 정의한다. 워크플로우는 [`business-logic-model.md`](business-logic-model.md), 엔티티 상세는 [`domain-entities.md`](domain-entities.md).

---

## 1. Cross-cutting 룰 (CR-1 ~ CR-7)

stories.md §0의 7개 룰을 backend 관점에서 강제하는 메커니즘.

| ID | 룰 | 강제 메커니즘 |
|----|----|----------------|
| **CR-1** | 매장ID 스코프 격리 | `StoreScopeGuard` — 모든 보호 경로(`/admin/**`, `/menus`, `/ads`, `/sse/stores/**`)에 적용. JWT payload·QR 세션의 storeId를 path/query·entity에 강제 매치. |
| **CR-2** | 테이블 세션 라이프사이클 | (v2.2) 첫 스캔 시 TableSession + Cart 생성, 테이블당 `status=ACTIVE` 1개 unique 제약(DB). 종료 시 cascade — TableSession.endedAt 설정, SessionParticipant.revokedAt 일괄, Cart clear, Order/OrderHistory 분기. |
| **CR-3** | 현재 세션 가시성 | 고객 read API (`/sessions/:sid/orders`, `/sessions/:sid/cart`)는 `SessionScopeGuard`가 활성 세션·revoked 미설정 토큰만 허용. 종료된 세션은 자동 401. |
| **CR-4** | 주문 스냅샷 보존 | OrderItem 생성 시 `menuNameSnapshot`, `unitPriceSnapshot`을 Menu에서 복사. Menu UPDATE·DELETE는 OrderItem에 영향 X. Menu 삭제는 soft-delete(`deletedAt`)로 OrderItem 참조 무결성 보장. |
| **CR-5** | 비밀번호·토큰 안전성 | StoreUser.passwordHash = bcrypt(rounds≥10). qrToken = UUIDv4 (crypto.randomUUID). SessionParticipant.token = UUIDv4. JWT = HS256 + 30일 exp. |
| **CR-6** | 공동 장바구니 동시성 | Cart row `FOR UPDATE` 직렬화 + `version` 단조 증가. SSE 이벤트 페이로드에 version 포함. 클라이언트는 version monotonic 검증. |
| **CR-7** | 광고 단방향 | AdsModule은 `Advertisement.active=true` 만 read. 외부 API 호출 없음. 매장ID·테이블ID 분기 없음. |

---

## 2. 도메인별 비즈니스 룰

### 2.1 Auth (AuthModule)

| 룰 | 정의 |
|----|------|
| AU-1 | 로그인 시도 카운터 — 동일 `(storeId, username)` 조합 연속 실패 5회 시 `lockUntil = now + 5분`. lockUntil 이후 자동 해제. |
| AU-2 | 성공 시 `failedAttempts=0`, `lockUntil=NULL`. |
| AU-3 | JWT payload = `{ storeId, userId, iat, exp }`. exp = iat + 30일. |
| AU-4 | 로그아웃은 클라이언트 토큰 폐기 + 서버 in-memory blacklist(선택). 만료까지 통과 가능. |

### 2.2 Table·Session (TableModule)

| 룰 | 정의 |
|----|------|
| TS-1 | Table.qrToken은 매장 unique. UUIDv4 발급. 변경 시 UC-6 cascade. |
| TS-2 | TableSession은 테이블당 `status=ACTIVE` 1개 unique (DB partial unique index). |
| TS-3 | 첫 스캔 시 TableSession + Cart 동시 생성 (v2.2). 이후 스캔은 활성 세션 합류. |
| TS-4 | SessionParticipant는 세션 종료·QR 재발급 시 일괄 `revokedAt=now`. |
| TS-5 | 빈 세션(주문 0건) 종료 시 OrderHistory 미기록 (v2.2). |
| TS-6 | 매장 영업 종료(`Store.active=false`) 시 신규 QR 스캔 거부. |

### 2.3 Menu (MenuModule)

| 룰 | 정의 |
|----|------|
| MN-1 | 가격 ≥ 1원 (INTEGER, KRW). 0 또는 음수 → 400 + `MENU_PRICE_INVALID`. |
| MN-2 | 메뉴 soldout=true이면 카트 추가·주문 확정 모두 거부 (US-A4.4). |
| MN-3 | 메뉴 수정 시 `soldout` 플래그 보존 (별도 토글로만 변경). |
| MN-4 | 메뉴 삭제는 soft-delete (`deletedAt`). 카트에 포함되어 있으면 409 → 400 + `MENU_IN_CART` (v2.2). |
| MN-5 | 메뉴 카테고리 정렬은 동일 카테고리 내부에만 영향. |

### 2.4 Cart (CartModule)

| 룰 | 정의 |
|----|------|
| CT-1 | Cart는 TableSession 1:1 (sessionId가 PK & FK). 첫 스캔 시 자동 생성, 종료 시 clear. |
| CT-2 | CartItem PK = `(cartSessionId, menuId)` — 동일 메뉴 재추가는 quantity 누적 (UPSERT). |
| CT-3 | quantity ≤ 0은 자동 DELETE. |
| CT-4 | 빈 카트 주문 확정 거부 → 400 + `CART_EMPTY`. |
| CT-5 | Cart.version은 모든 변경(추가·수정·삭제·비우기·주문 확정) 시 +1. SSE 이벤트 페이로드에 포함. |
| CT-6 | 품절 메뉴 카트 추가 거부 → 400 + `MENU_SOLDOUT`. |

### 2.5 Order (OrderModule)

| 룰 | 정의 |
|----|------|
| OD-1 | Order는 활성 TableSession에만 생성. |
| OD-2 | OrderItem 생성 시 menuName·unitPrice 스냅샷 복사 (CR-4). |
| OD-3 | Order.total = Σ(unitPriceSnapshot × quantity). 트랜잭션 내 계산. |
| OD-4 | 관리자 직권 삭제는 활성 세션 주문만 (Q3) → 종료 세션의 주문 삭제 시 400 + `ORDER_IN_HISTORY`. |
| OD-5 | 삭제는 soft-delete (`deletedAt`). 관리자 대시보드 그리드에서 제외, SSE 동기화. |
| OD-6 | OrderHistory는 read-only. 세션 종료 시점에만 INSERT, 이후 변경 없음. |

### 2.6 SSE (SseModule)

| 룰 | 정의 |
|----|------|
| SS-1 | 두 채널 — 세션(`/sse/sessions/:sid`)·매장(`/sse/stores/:storeId`). |
| SS-2 | 도메인 서비스는 `EventEmitter2`로 emit, SseService가 `@OnEvent` listener로 채널 라우팅. |
| SS-3 | 모든 SSE는 트랜잭션 commit 직후 발화 (rollback 시 emit 안 함). |
| SS-4 | Keep-alive 15초마다 `: keep-alive\n\n`. |
| SS-5 | 클라이언트 재연결은 EventSource 기본 동작. 서버는 stateless이므로 누락 보상 안 함 — 클라이언트가 reconnect 직후 reconcile fetch. |

### 2.7 Ads (AdsModule)

| 룰 | 정의 |
|----|------|
| AD-1 | `Advertisement.active=true` 만 노출. |
| AD-2 | slot 값은 `menu_top`, `menu_bottom`, `cart_bottom` 3종만. |
| AD-3 | 매장ID·테이블ID 분기 없음 — 전 시스템 동일 (CR-7). |
| AD-4 | 광고 read 가드 — QR 토큰 유효한 손님만 (`QrTokenGuard`). 관리자 일반 노출 X. |

### 2.8 Admin Dashboard (AdminModule)

| 룰 | 정의 |
|----|------|
| AM-1 | DashboardDto = 매장 내 모든 Table + 각 Table의 활성 TableSession + 활성 세션의 Order 미리보기 N개. |
| AM-2 | 빈 테이블(활성 세션 없음)도 카드에 표시 — "주문 없음" 상태. |
| AM-3 | 상태 컬럼·테이블 필터·참가자 수 표시는 MVP 제외 (v2.1). |
| AM-4 | 매장ID 스코프 강제 — JWT payload storeId 외 데이터 누출 차단. |

---

## 3. 검증 정책 (class-validator 매핑)

shared 패키지 DTO에 class-validator 데코레이터 부착. NestJS `ValidationPipe` 글로벌 등록.

| DTO | 검증 룰 |
|-----|---------|
| LoginRequest | `@IsString @MinLength(1)` storeId·username, `@IsString @MinLength(4)` password |
| CreateMenuDto | `@IsString @MinLength(1)` name, `@IsInt @Min(1)` price, `@IsOptional @IsString` description·imageUrl, `@IsUUID` categoryId |
| UpdateMenuDto | `@IsOptional` 적용된 동일 룰 |
| SoldoutToggleDto | `@IsBoolean` soldout |
| MenuSortDto | `@IsArray @ArrayMinSize(1) @IsUUID(undefined, { each: true })` ids |
| AddCartItemDto | `@IsUUID` menuId, `@IsInt @Min(1)` quantity |
| UpdateCartItemDto | `@IsInt @Min(0)` quantity (0이면 삭제) |
| CreateTableDto | `@IsInt @Min(1)` number |
| HistoryQueryDto | `@IsUUID` tableId, `@IsISO8601` from·to |

검증 실패 → NestJS 자동 응답 400 + 메시지 배열. **단순화 합의로** 응답 본문을 `{ statusCode: 400, message, errorCode: 'VALIDATION_FAILED', details: [...] }`로 인터셉터에서 통일.

---

## 4. 통합 HTTP 에러 코드 카탈로그 (Q1 답변 — 단순화)

### 4.1 통합 정책

- **인증·인가 가드 표준 응답은 그대로**: JWT 만료 = 401, 스코프 위반 = 403, 미인증 접근 = 401.
- **비즈니스 사전 검증 실패는 모두 400 + errorCode 통합**: 클라이언트는 `errorCode`로 화면 메시지 매핑.
- 응답 본문 공통: `{ statusCode, message, errorCode, details? }`.

### 4.2 errorCode 카탈로그

| errorCode | HTTP | 발생 위치 | 메시지 (한국어 기본) |
|-----------|:----:|-----------|----------------------|
| `VALIDATION_FAILED` | 400 | class-validator 자동 | "입력값을 확인해주세요." (+details) |
| `STORE_CLOSED` | 400 | UC-1 / 일부 admin | "매장이 영업 중이 아닙니다." |
| `QR_REVOKED` | 400 | UC-1 | "QR이 만료되었어요. 직원을 호출해주세요." |
| `MENU_NOT_FOUND` | 400 | UC-5/UC-8 | "메뉴를 찾을 수 없습니다." |
| `MENU_PRICE_INVALID` | 400 | US-A4.1 | "가격은 1원 이상이어야 합니다." |
| `MENU_SOLDOUT` | 400 | UC-2 / UC-3 | "품절된 메뉴입니다." |
| `MENU_IN_CART` | 400 | UC-8 (v2.2) | "이 메뉴는 손님 카트에 담겨 있습니다. 손님이 비울 때까지 삭제할 수 없어요." |
| `CART_EMPTY` | 400 | UC-3 | "장바구니가 비어 있습니다." |
| `CART_HAS_DELETED_MENU` | 400 | UC-3 (메뉴가 soft-delete된 경우) | "장바구니에 더 이상 판매하지 않는 메뉴가 있어요." |
| `SESSION_INACTIVE` | 400 | UC-4 (빈/이미 종료) | "종료할 활성 세션이 없습니다." |
| `ORDER_NOT_FOUND` | 400 | UC-7 | "주문을 찾을 수 없습니다." |
| `ORDER_IN_HISTORY` | 400 | UC-7 (Q3) | "이미 종료된 테이블의 주문은 수정할 수 없습니다." |
| `TABLE_NOT_FOUND` | 400 | UC-6 / admin | "테이블을 찾을 수 없습니다." |
| `TABLE_NUMBER_DUPLICATE` | 400 | US-A3.1 신규 등록 | "이미 같은 번호의 테이블이 있습니다." |
| `LOGIN_RATE_LIMITED` | 400 (header `Retry-After`) | AU-1 | "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요." |
| `LOGIN_FAILED` | 401 | US-A1.1 | "매장ID·사용자명·비밀번호를 확인해주세요." |
| (가드 표준) | 401 | JWT 만료·세션 무효 | NestJS 기본 |
| (가드 표준) | 403 | 스코프 위반·매장 영업 종료 | NestJS 기본 |
| (catch-all) | 500 | 예상 외 | "잠시 후 다시 시도해주세요." |

### 4.3 NestJS 구현 메모

- `HttpExceptionFilter`가 모든 throw를 위 포맷으로 직렬화.
- `BusinessException`(custom)을 도메인 서비스가 throw → `{ statusCode: 400, errorCode, message }` 자동 매핑.
- `Retry-After` header는 `LOGIN_RATE_LIMITED` 응답에 lockUntil까지의 초.

---

## 5. 트랜잭션 정책

- TypeORM `DataSource.transaction(async manager => …)` 패턴.
- UC-2·UC-3·UC-4·UC-6·UC-7·UC-8 모두 트랜잭션 안에서 처리.
- 트랜잭션 분리 기준: 단일 use-case 단위 (여러 도메인 협력 가능, 외부 호출 없음).
- Cart row `FOR UPDATE` lock으로 last-write-wins 직렬화 (CR-6, CT-5).
- SSE 발화는 commit 이후 (services.md §3.2 그대로).

---

## 6. 시드 데이터 룰

(services.md §3.6 그대로 구체화)

| Entity | 시드 항목 | 검증 |
|--------|-----------|------|
| Store | 1개 — "데모 매장", active=true | seed.service onModuleInit 진입점 |
| StoreUser | 점주(`owner@demo`) + 알바(`crew@demo`), 둘 다 bcrypt(`demo1234`) | AU-3 만족 |
| MenuCategory | 음료·식사·디저트 3개 | sortOrder 0/1/2 |
| Menu | 카테고리당 4개씩 12개. soldout=false, price 1000~15000 KRW | MN-1 통과 |
| Table | 1~5번 5개. qrToken UUIDv4 | TS-1 unique |
| Advertisement | 모두의주차장 2개 (slot=menu_top, cart_bottom) | AD-2 |

시드 적재는 idempotent — 이미 있으면 skip (중복 INSERT 방지).

---

## 7. 룰 ↔ Use-case Traceability (요약)

| 룰 | 적용 use-case |
|----|----------------|
| CR-1 | 모든 protected endpoint |
| CR-2 | UC-1, UC-4, UC-6 |
| CR-3 | UC-2, UC-3, UC-7 (고객 read) |
| CR-4 | UC-3 (스냅샷), UC-8 (soft-delete) |
| CR-5 | UC-1, AuthService |
| CR-6 | UC-2, UC-3 |
| CR-7 | AdsModule |
| MN-2 | UC-2, UC-3 |
| MN-4 | UC-8 |
| OD-4 | UC-7 |
| TS-5 | UC-4, UC-6 (cascade) |
