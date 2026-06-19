# U2 Customer Web — Domain Entities (Client) (v2.2)

> **Stage**: CONSTRUCTION · U2 · Functional Design Step 6 산출물 (3/4)

본 문서는 U2 client-side **로컬 데이터 모델**을 정의한다 (localStorage 키 + React Query 캐시 키 + 컴포넌트 상태). 서버 측 엔티티는 U1 [`domain-entities.md`](../../u1-backend/functional-design/domain-entities.md) 참조.

---

## 1. localStorage 키

| Key | 값 타입 | 라이프사이클 |
|-----|---------|---------------|
| `tableOrder.sessionToken` | string | QR 스캔 후 set, 세션 종료/401 시 clear |
| `tableOrder.sessionId` | string | 동상 |
| `tableOrder.storeId` | string | 동상 |
| `tableOrder.storeName` | string | 동상 (헤더 표시용) |
| `tableOrder.tableNumber` | string (숫자) | 동상 |
| `tableOrder.a11y.largeText` | `'1'` or `''` | 세션 무관, 본인 폰 영구 |
| `tableOrder.a11y.highContrast` | `'1'` or `''` | 동상 |
| `tableOrder.help.completedAt` | ISO string | 세션 종료 SSE 수신 시 clear |

세션 폐기 시 `a11y.*`는 유지 (다음 손님 폰이 아니라 본인 폰이므로 — NFR-5).

## 2. React Query 캐시 키

| Key | DTO | 사용 |
|-----|-----|------|
| `['menu']` | `MenuDto[]` | GET /menus, SSE `menu.soldout.changed` 시 invalidate |
| `['ads', 'menu_top']` | `AdvertisementDto[]` | GET /ads?slot=menu_top |
| `['ads', 'cart_bottom']` | `AdvertisementDto[]` | GET /ads?slot=cart_bottom |
| `['cart', sessionId]` | `CartDto` | GET /cart, SSE `cart.updated`/`cart.cleared` 시 setQueryData |
| `['orders', sessionId]` | `OrderDto[]` | GET /orders, SSE `order.created`/`deleted` 시 setQueryData |

기본 옵션:
- staleTime: 30s
- gcTime: 5m
- refetchOnWindowFocus: false (SSE로 충분)

## 3. 컴포넌트 상태 (모달·토글)

| 상태 | 위치 | 스코프 |
|------|------|--------|
| 메뉴 상세 모달 열림 | `MenuPage` useState | 페이지 |
| 카트 비우기 확인 다이얼로그 | `CartPage` useState | 페이지 |
| 주문 확정 다이얼로그 | `CartPage` useState | 페이지 |
| 토스트 큐 | 전역 `useToast()` 훅 (Context) | 앱 |
| 헬프 오버레이 step | `HelpOverlay` useState | 컴포넌트 |
| a11y 토글 상태 | `useAccessibility()` (Context + localStorage) | 앱 |
| SSE 연결 상태 | `useSseChannel()` 훅 내부 | 페이지(메뉴/카트/주문) |

## 4. URL 파라미터·쿼리

| 라우트 | 파라미터 |
|--------|----------|
| `/qr/:token` | token: UUIDv4 |
| `/menu` | (없음) |
| `/cart` | (없음) |
| `/orders` | (없음) |
| `/help` | (없음 — 모달 형태로 호출 시) |
| `/error/:code` | code: `no-session` \| `scan-failed` \| `session-ended` |

## 5. 클라이언트 모델 ↔ 서버 contract 매핑

| Client cache | Server endpoint | SSE 이벤트 |
|--------------|-----------------|-----------|
| `['menu']` | GET `/menus` | `menu.soldout.changed` (invalidate) |
| `['cart', sid]` | GET/POST/PATCH/DELETE `/sessions/:sid/cart` | `cart.updated`, `cart.cleared` (setQueryData) |
| `['orders', sid]` | GET/POST `/sessions/:sid/orders` | `order.created`, `order.deleted` (setQueryData) |
| `['ads', slot]` | GET `/ads?slot=` | — (정적) |
