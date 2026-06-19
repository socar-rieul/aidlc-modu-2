# Components — 테이블오더 서비스 (v2)

> **Stage**: INCEPTION · Application Design · Step 10 산출물 (1/4)
> **Inputs**: [`requirements.md` v2](../requirements/requirements.md) · [`stories.md` v2](../user-stories/stories.md) · [`application-design-plan.md`](../plans/application-design-plan.md)
> **확정 스택**: NestJS(도메인별 모듈) · TypeORM + SQLite · class-validator · React + TanStack Query · pnpm workspaces

본 문서는 **고수준 컴포넌트 식별·책임·인터페이스**만 다룬다. 메서드 시그니처는 [`component-methods.md`](component-methods.md), 의존 관계는 [`component-dependency.md`](component-dependency.md), 서비스 오케스트레이션은 [`services.md`](services.md) 참조. 비즈니스 룰 디테일은 CONSTRUCTION 단계 Functional Design(per-unit)에서 정의.

---

## 0. Repository 구조 (pnpm workspaces)

```text
aidlc-modu/
├── package.json                # workspace 루트
├── pnpm-workspace.yaml         # packages/* 선언
├── packages/
│   ├── backend/                # U1 NestJS API + SSE + SQLite
│   ├── customer-web/           # U2 고객용 React PWA
│   ├── admin-web/              # U3 관리자 React SPA
│   └── shared/                 # 공유 DTO·SSE 이벤트 타입
└── aidlc-docs/                 # (본 문서) — 코드와 분리
```

---

## 1. Backend (U1) — NestJS 모듈 카탈로그

도메인별 모듈 9개 + 1 Common. 각 모듈은 내부에 `controller / service / repository / dto / entity` 폴더를 둔다 (Q1 답변).

| Module | 책임 | 주요 엔티티 | 노출 인터페이스 | 커버 스토리 |
|--------|------|-------------|-----------------|-------------|
| **AuthModule** | 관리자 로그인·JWT 발급(30일)·bcrypt 검증·로그인 시도 카운터 | StoreUser, LoginAttempt | REST `/admin/auth/*`, `JwtAuthGuard` | US-A1.1, A1.2, A1.3 |
| **StoreModule** | 매장(Store) 마스터·매장ID 스코프 가드 | Store | `StoreScopeGuard` (CR-1 강제), 내부 read API | (cross-cutting) |
| **TableModule** | 테이블 마스터·QR 토큰 발급·세션 라이프사이클·SessionParticipant 토큰 발급·일괄 무효화 | Table, TableSession, SessionParticipant | REST `/qr/scan/:token`, `/admin/tables/*`, `QrTokenGuard`, `SessionScopeGuard` (CR-2) | US-C1.1, A3.1, A3.3 |
| **MenuModule** | 메뉴 CRUD + 카테고리 + 정렬 + **품절 토글(soldout)** + 가격 검증 | Menu, MenuCategory | REST `/menus`, `/admin/menus/*` | US-C2.1, A4.1~A4.4 |
| **CartModule** | 공동 장바구니 조회·추가·수정·삭제·전체 비우기 + 서버 권한 버전 부여(CR-6 last-write-wins) + 품절 보호 | Cart, CartItem | REST `/sessions/:sessionId/cart/*` | US-C3.1, C3.2, C3.3, C3.4 |
| **OrderModule** | 주문 확정(장바구니→주문)·주문 스냅샷(CR-4)·테이블 전체 내역·관리자 직권 삭제·OrderHistory 이동 | Order, OrderItem, OrderHistory | REST `/sessions/:sessionId/orders/*`, `/admin/orders/*` | US-C4.1, C4.2, C5.1, A3.2, A3.4 |
| **SseModule** | 두 SSE 채널 관리(세션 채널 / 매장 채널) + EventEmitter2 라우팅 + keep-alive | (in-memory) | REST `/sse/sessions/:sessionId`, `/sse/stores/:storeId` | US-A2.1, C3.1, C4.1, A4.4 (cross-cutting) |
| **AdsModule** | Advertisement 시드 + 노출 endpoint (CR-7 단방향) | Advertisement | REST `/ads?slot=` | US-C6.1 |
| **AdminModule** | 대시보드 그리드 집계(read-only orchestration across Table·Order·Cart) + 광고 슬롯 read | (집계만, 자체 엔티티 X) | REST `/admin/dashboard` | US-A2.1, A2.2, A2.3 |
| **CommonModule** | 전역 가드(JwtAuthGuard, StoreScopeGuard, QrTokenGuard, SessionScopeGuard), 인터셉터, 예외 필터, 로깅, EventEmitter2 wiring | — | DI 토큰 | (cross-cutting) |

### 1.1 데이터 모델 매핑 (requirements.md v2 §3.3 ↔ TypeORM 엔티티)

| Entity | 모듈 | 핵심 컬럼 | 관계 |
|--------|------|-----------|------|
| Store | StoreModule | `id`(PK), `name`, `active` | 1 ↔ N: StoreUser, Table, Menu, Order |
| StoreUser | AuthModule | `id`, `storeId`, `username`, `passwordHash`(bcrypt), `failedAttempts`, `lockUntil` | N ↔ 1: Store |
| Table | TableModule | `id`, `storeId`, `number`, `qrToken`(UUIDv4, unique), `active` | N ↔ 1: Store; 1 ↔ N: TableSession |
| TableSession | TableModule | `id`, `tableId`, `startedAt`, `endedAt?`, `status` | N ↔ 1: Table; 1 ↔ N: SessionParticipant, Order; 1 ↔ 1: Cart |
| SessionParticipant | TableModule | `id`, `sessionId`, `deviceToken`(opaque), `joinedAt`, `revokedAt?` | N ↔ 1: TableSession |
| Cart | CartModule | `sessionId`(PK & FK), `version`(int, 단조 증가), `updatedAt` | 1 ↔ 1: TableSession; 1 ↔ N: CartItem |
| CartItem | CartModule | `id`, `cartSessionId`, `menuId`, `quantity`, `addedAt` | N ↔ 1: Cart, Menu |
| Order | OrderModule | `id`, `sessionId`, `total`, `createdAt`, `deletedAt?`(직권 삭제) | N ↔ 1: TableSession; 1 ↔ N: OrderItem |
| OrderItem | OrderModule | `id`, `orderId`, `menuId`, `menuNameSnapshot`, `unitPriceSnapshot`, `quantity` | N ↔ 1: Order |
| OrderHistory | OrderModule | `id`, `tableId`, `originalSessionId`, `closedAt`, `summary`(JSON 스냅샷) | N ↔ 1: Table |
| Menu | MenuModule | `id`, `storeId`, `categoryId`, `name`, `price`, `description?`, `imageUrl?`, `sortOrder`, `soldout` (BOOL, default false) | N ↔ 1: Store, MenuCategory |
| MenuCategory | MenuModule | `id`, `storeId`, `name`, `sortOrder` | N ↔ 1: Store; 1 ↔ N: Menu |
| Advertisement | AdsModule | `id`, `slot`(`menu_top`\|`menu_bottom`\|`cart_bottom`), `imageUrl`, `clickUrl`, `active` | — (시스템 전체 공통) |

**총 13개 엔티티** (LoginAttempt를 StoreUser 내부 필드로 흡수, MenuCategory 별도 분리).

---

## 2. Customer Web (U2) — React PWA 컴포넌트 트리

`packages/customer-web/src/`

```text
src/
├── main.tsx                # entry — PWA registration + QueryClient provider
├── App.tsx                 # 라우터 (react-router)
├── pages/                  # 라우트 단위 페이지
│   ├── QrEntryPage.tsx     # /qr/:token  → /menu 자동 진입 (US-C1.1)
│   ├── MenuPage.tsx        # /menu       (US-C2.1, C6.1)
│   ├── CartPage.tsx        # /cart       (US-C3.1~C3.4, C6.1)
│   ├── OrderHistoryPage.tsx# /orders     (US-C5.1)
│   ├── HelpOverlay.tsx     # 도움말 오버레이 (US-C0.1)
│   └── ConfirmOrderPage.tsx# /confirm    (US-C4.1 강화 확인 — P4 보조)
├── containers/             # 페이지 내 데이터 컨테이너
│   ├── MenuListContainer.tsx
│   ├── CartContainer.tsx
│   ├── OrderListContainer.tsx
│   └── AdSlotContainer.tsx (US-C6.1)
├── components/             # 프레젠테이션
│   ├── MenuCard.tsx
│   ├── CategoryChips.tsx
│   ├── CartItemRow.tsx
│   ├── OrderRow.tsx
│   ├── AdBanner.tsx
│   ├── ConfirmDialog.tsx   # 큰 글자·60×60 버튼 (US-C4.1, C3.2)
│   ├── SoldoutBadge.tsx    # 회색 처리 + "품절" 배지 (US-C2.1, A4.4)
│   ├── LargeTextToggle.tsx # 큰 글자 + 고대비 토글 (US-C0.2)
│   └── HelpButton.tsx
├── hooks/
│   ├── useSessionToken.ts  # QR 토큰·세션 토큰 localStorage 관리 (NFR-5)
│   ├── useSseChannel.ts    # EventSource(`/sse/sessions/:sessionId`) + queryClient 갱신
│   ├── useMenuQuery.ts     # GET /menus
│   ├── useCartQuery.ts     # GET /sessions/:sessionId/cart
│   ├── useCartMutation.ts  # POST/PATCH/DELETE cart
│   ├── useOrdersQuery.ts   # GET /sessions/:sessionId/orders
│   └── useAccessibility.ts # rem·큰글자·고대비 토글 localStorage (US-C0.2)
├── api/                    # fetch 래퍼 + shared DTO import
├── styles/                 # rem 단위 토큰 + 큰글자/고대비 모드 셀렉터 (NFR-4, NFR-11)
└── pwa/                    # manifest + service worker (홈 화면 추가)
```

**라우팅 규칙**: `/qr/:token` 진입 시 토큰 검증 → 세션 토큰 발급 → `/menu` 리다이렉트. 세션 토큰 없이 다른 라우트 접근 시 안내 화면 (`/error/no-session`).

---

## 3. Admin Web (U3) — React SPA 컴포넌트 트리

`packages/admin-web/src/`

```text
src/
├── main.tsx
├── App.tsx                 # ProtectedRoute로 /login 외 가드
├── pages/
│   ├── LoginPage.tsx       # /login    (US-A1.1, A1.2, A1.3)
│   ├── DashboardPage.tsx   # /         (US-A2.1, A2.2, A2.3)
│   ├── MenuManagementPage.tsx # /menus (US-A4.1~A4.4)
│   ├── TableManagementPage.tsx # /tables (US-A3.1, A3.3)
│   └── OrderHistoryPage.tsx # /history (US-A3.4)
├── containers/
│   ├── TableGridContainer.tsx     # SSE 매장 채널 구독
│   ├── OrderDetailModalContainer.tsx
│   ├── MenuListContainer.tsx
│   ├── TableListContainer.tsx
│   └── HistoryTableContainer.tsx
├── components/
│   ├── TableCard.tsx         # 총 주문액·최신 주문 미리보기 (참가자 수 표시 X — v2.1)
│   ├── OrderModal.tsx        # 모달 — 상태 컬럼 없음 (v2.1)
│   ├── MenuRow.tsx
│   ├── SoldoutToggle.tsx     # (US-A4.4)
│   ├── QrIssueDialog.tsx     # QR 발급/재발급 + PDF 다운로드 (US-A3.1)
│   ├── SessionCloseButton.tsx# (US-A3.3)
│   ├── DateRangePicker.tsx   # (US-A3.4)
│   └── ConfirmDialog.tsx
├── hooks/
│   ├── useAdminAuth.ts      # JWT 토큰 localStorage + 만료 감지 (NFR-2)
│   ├── useSseChannel.ts     # EventSource(`/sse/stores/:storeId`)
│   ├── useDashboardQuery.ts # GET /admin/dashboard
│   ├── useMenusQuery.ts
│   ├── useTablesQuery.ts
│   └── useHistoryQuery.ts
├── api/                     # fetch + JWT Authorization 헤더 자동 부착
└── styles/                  # 데스크톱 그리드 레이아웃
```

---

## 4. Shared Package — 공유 타입

`packages/shared/src/`

```text
src/
├── dto/
│   ├── auth.dto.ts        # LoginRequest, LoginResponse
│   ├── qr.dto.ts          # QrScanResponse
│   ├── menu.dto.ts        # MenuDto, CreateMenuDto, UpdateMenuDto, SoldoutToggleDto
│   ├── cart.dto.ts        # CartDto, CartItemDto, AddCartItemDto, UpdateCartItemDto
│   ├── order.dto.ts       # OrderDto, OrderItemDto, CreateOrderResponse
│   ├── table.dto.ts       # TableDto, CreateTableDto, QrRegenerateResponse
│   ├── admin.dto.ts       # DashboardDto, HistoryQueryDto
│   └── ads.dto.ts         # AdvertisementDto
├── sse-events/
│   ├── session-channel.ts # SessionSseEvent 유니온 타입
│   └── store-channel.ts   # StoreSseEvent 유니온 타입
├── enums/
│   ├── ad-slot.enum.ts    # 'menu_top' | 'menu_bottom' | 'cart_bottom'
│   └── session-status.enum.ts
└── index.ts
```

`class-validator` 데코레이터를 shared DTO에 부착해 backend·frontend 모두에서 동일 검증 적용 가능.

---

## 5. 디자인 설계 책임 분할 (다음 단계 미리보기)

| 단계 | 산출물 위치 | 본 문서 대비 추가 사항 |
|------|-------------|------------------------|
| [`component-methods.md`](component-methods.md) | inception/application-design/ | REST endpoint 카탈로그 + SSE 이벤트 페이로드 + 서비스 메서드 시그니처 |
| [`services.md`](services.md) | inception/application-design/ | 서비스 오케스트레이션 + cross-cutting 가드/트랜잭션 정책 |
| [`component-dependency.md`](component-dependency.md) | inception/application-design/ | 의존 매트릭스 + 시퀀스 다이어그램 3개 |
| Functional Design (per-unit) | construction/{unit}/functional-design/ | 각 메서드의 G/W/T 비즈니스 룰 정의 |
| NFR Requirements/Design (per-unit) | construction/{unit}/nfr-*/ | SSE 채널 keep-alive 정책·last-write-wins 구현 패턴·a11y rem 단위 시스템 |
