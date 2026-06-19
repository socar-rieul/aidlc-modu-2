# U3 Admin Web — Domain Entities (Client) (v2.2)

> **Stage**: CONSTRUCTION · U3 · Functional Design Step 6 산출물 (3/4)

---

## 1. localStorage 키

| Key | 값 | 라이프사이클 |
|-----|----|---------------|
| `tableOrder.admin.jwt` | string | 로그인 set, 만료/로그아웃 clear |
| `tableOrder.admin.expiresAt` | ISO string | 동상 |
| `tableOrder.admin.storeId` | string | JWT decode 또는 응답에서 추출(편의) |

## 2. React Query 캐시 키

| Key | DTO | 사용 |
|-----|-----|------|
| `['dashboard']` | `DashboardDto` | GET `/admin/dashboard`, SSE invalidate |
| `['menus']` | `MenuDto[]` | GET `/admin/menus`, SSE soldout invalidate |
| `['tables']` | `TableDto[]` | GET `/admin/tables` |
| `['history', tableId, from, to]` | `OrderHistoryDto[]` | GET `/admin/history?...` |

기본 옵션: staleTime 30s, refetchOnWindowFocus false.

## 3. 컴포넌트 상태

| 상태 | 위치 |
|------|------|
| 로그인 폼 필드 | LoginPage useState |
| 메뉴 등록/수정 폼 | MenuManagementPage useState |
| 테이블 추가 폼 | TableManagementPage useState |
| ConfirmDialog open | 각 페이지 useState |
| 주문 상세 모달 | DashboardPage useState |
| 날짜 필터 (from/to) | OrderHistoryPage useState |
| 토스트 큐 | 전역 ToastProvider |

## 4. URL

| 라우트 | 파라미터 |
|--------|----------|
| `/login` | — |
| `/` (= DashboardPage) | — |
| `/menus` | — |
| `/tables` | — |
| `/history` | (query string으로 tableId / from / to 옵션) |

## 5. Client ↔ Server 매핑

| Client cache | Server | SSE |
|--------------|--------|-----|
| `['dashboard']` | GET `/admin/dashboard` | 매장 채널 전 이벤트 invalidate |
| `['menus']` | `/admin/menus*` | `menu.soldout.changed` invalidate |
| `['tables']` | `/admin/tables*` | (없음 — 변경은 mutation 후 invalidate) |
| `['history', ...]` | GET `/admin/history` | (없음) |
