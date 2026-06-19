# U3 Admin Web — Frontend Components (v2.2)

> **Stage**: CONSTRUCTION · U3 · Functional Design Step 6 산출물 (4/4)

---

## 1. 계층

```text
App (BrowserRouter + QueryClientProvider + ToastProvider)
├── Routes
│   ├── /login → LoginPage
│   ├── /       → RequireAuth → DashboardPage
│   ├── /menus  → RequireAuth → MenuManagementPage
│   ├── /tables → RequireAuth → TableManagementPage
│   ├── /history → RequireAuth → OrderHistoryPage
│   └── *       → Navigate /
│
├── 페이지
│   ├── LoginPage (storeId·username·password 입력)
│   ├── DashboardPage
│   │   ├── AdminHeader (매장명·로그아웃·내비)
│   │   ├── TableGrid → TableCard × N
│   │   └── OrderDetailModal (카드 클릭 시)
│   ├── MenuManagementPage
│   │   ├── AdminHeader
│   │   ├── MenuFormDialog (등록/수정)
│   │   ├── MenuTable → MenuRow × N
│   │   └── ConfirmDialog (삭제)
│   ├── TableManagementPage
│   │   ├── AdminHeader
│   │   ├── TableFormDialog (번호 입력)
│   │   ├── TableList → TableRow (번호·QR 다운로드·재발급·세션 종료)
│   │   └── ConfirmDialog
│   └── OrderHistoryPage
│       ├── AdminHeader
│       ├── TableSelector + DateRangePicker
│       └── HistoryList
│
├── 공통 컴포넌트
│   ├── AdminHeader (storeName·navigation·logout)
│   ├── TableCard (active session badge·total·미리보기)
│   ├── OrderDetailModal (sessionId 주문 목록 + "삭제" 액션)
│   ├── MenuRow (이름·가격·soldout 토글·수정·삭제)
│   ├── TableRow (번호·QR 다운로드·재발급·세션 종료)
│   ├── MenuFormDialog (카테고리·이름·가격·이미지URL)
│   ├── TableFormDialog (번호)
│   ├── ConfirmDialog (재사용)
│   └── Toast (전역)
│
└── 훅
    ├── useAdminAuth (jwt + expiresAt + login + logout)
    ├── useRequireAuth → Navigate /login 가드
    ├── useStoreSseChannel(storeId) — 매장 채널
    ├── useDashboardQuery
    ├── useMenuAdminQuery + Mutations(create/update/delete/sort/toggleSoldout)
    ├── useTableAdminQuery + Mutations(create/regenerateQr/closeSession)
    ├── useHistoryQuery(query)
    ├── useDeleteOrder
    ├── useToast (U2 재사용 패턴)
    └── useQrDownload(tableId, format)
```

## 2. 주요 Props

### TableCard
```ts
type TableCardProps = {
  card: TableCardDto;
  onClick: (card: TableCardDto) => void;
};
```

### OrderDetailModal
```ts
type OrderDetailModalProps = {
  open: boolean;
  table: TableCardDto | null;
  onClose: () => void;
};
```

### MenuRow
```ts
type MenuRowProps = {
  menu: MenuDto;
  onEdit: (menu: MenuDto) => void;
  onDelete: (menu: MenuDto) => void;
  onToggleSoldout: (menu: MenuDto) => void;
};
```

### TableRow
```ts
type TableRowProps = {
  table: TableDto;
  onRegenerate: (table: TableDto) => void;
  onCloseSession: (table: TableDto) => void;
};
```

## 3. 인터랙션 흐름

### 신규 주문 SSE 강조
1. `useStoreSseChannel`이 `order.created` 수신
2. `invalidate(['dashboard'])` + 토스트 "신규 주문!"
3. TableCard 색상 강조(`is-new`) 3초 후 자연 해제

### QR 다운로드
1. `useQrDownload(tableId, 'png').mutate()`
2. fetch with Authorization → Blob → URL.createObjectURL
3. 임시 `<a download="table-N.png">` 트리거 → revoke

### 세션 종료
1. TableCard "이용 완료" 클릭 → ConfirmDialog
2. POST `/admin/tables/:id/session/close`
3. 성공 시 invalidate + 토스트 (movedOrders 표시)

## 4. data-testid 패턴

- `login-submit`, `login-rate-limited-banner`
- `table-card-${tableId}`, `table-card-${tableId}-close-session`
- `menu-row-${menuId}`, `menu-row-${menuId}-soldout-toggle`, `menu-row-${menuId}-delete`
- `table-row-${tableId}`, `qr-download-${tableId}-png`, `qr-regenerate-${tableId}`
- `history-filter-from`, `history-filter-to`, `history-row-${historyId}`

## 5. 데스크톱 레이아웃

- 최대 너비 1200px 컨테이너
- TableGrid: CSS Grid `repeat(auto-fill, minmax(280px, 1fr))` gap 16px
- MenuRow / TableRow: 데스크톱 풀폭 row
- 모달은 화면 중앙 max-width 480px
