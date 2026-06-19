# U2 Customer Web — Frontend Components (v2.2)

> **Stage**: CONSTRUCTION · U2 · Functional Design Step 6 산출물 (4/4)

---

## 1. 컴포넌트 계층

```text
App (BrowserRouter + QueryClientProvider + ToastProvider + AccessibilityProvider)
├── Routes
│   ├── /qr/:token → QrEntryPage
│   ├── /menu      → MenuPage         (RequireSession)
│   ├── /cart      → CartPage         (RequireSession)
│   ├── /orders    → OrderHistoryPage (RequireSession)
│   ├── /help      → HelpRoutePage    (RequireSession)
│   └── /error/:code → ErrorPage
│
├── Page 컨테이너
│   ├── QrEntryPage (POST /qr/scan/:token → navigate /menu)
│   ├── MenuPage
│   │   ├── PageHeader (매장명·테이블·헬프 버튼·a11y 토글)
│   │   ├── AdSlot slot=menu_top
│   │   ├── CategoryChips
│   │   ├── MenuList → MenuCard × N
│   │   ├── AdSlot slot=menu_bottom
│   │   ├── BottomBar (장바구니 아이콘 + 항목 수 + 총액)
│   │   └── MenuDetailModal (선택 시)
│   ├── CartPage
│   │   ├── PageHeader
│   │   ├── CartItemList → CartItemRow × N
│   │   ├── AdSlot slot=cart_bottom
│   │   ├── TotalBar
│   │   ├── ClearCartDialog
│   │   ├── ConfirmOrderDialog (P4 보조)
│   │   └── BackToMenuButton
│   ├── OrderHistoryPage
│   │   ├── PageHeader
│   │   └── OrderList → OrderRow × N
│   ├── HelpRoutePage / HelpOverlay
│   │   ├── Step 1~5 (메뉴→카트→확정→내역)
│   │   └── "다시 보지 않기" 버튼
│   └── ErrorPage (code에 따라 메시지)
│
├── 공통 컴포넌트
│   ├── PageHeader (storeName·tableNumber·HelpButton·LargeTextToggle·HighContrastToggle)
│   ├── MenuCard (data-testid="menu-card-{menuId}", soldout 회색 + "품절" 배지)
│   ├── CategoryChips (가로 스크롤)
│   ├── MenuDetailModal (큰 글자·풀스크린 모달)
│   ├── CartItemRow (+/-/삭제 버튼, 60×60 큰 글자 모드)
│   ├── AdBanner (외부 링크 confirm 후 새 탭)
│   ├── ConfirmDialog (재사용 — title·body·확인/취소 60×60)
│   ├── Toast (전역 큐)
│   ├── SoldoutBadge
│   ├── HelpButton (헤더 상시 노출)
│   ├── LargeTextToggle
│   └── HighContrastToggle
│
└── 훅
    ├── useSessionToken — localStorage CRUD + clear
    ├── useAccessibility — largeText/highContrast Context + classList
    ├── useHelp — completedAt 플래그
    ├── useSseChannel — EventSource + 이벤트 라우팅 + reconcile
    ├── useMenuQuery — TanStack Query GET /menus
    ├── useAdsQuery(slot) — GET /ads?slot=
    ├── useCartQuery — GET /cart
    ├── useCartMutation — POST/PATCH/DELETE cart (낙관적 갱신은 안 함, 서버 응답 우선)
    ├── useOrdersQuery — GET /orders
    ├── useConfirmOrder — POST /orders + navigate
    └── useToast — 토스트 큐 (Context)
```

## 2. Props/State 요약 (핵심 컴포넌트)

### MenuCard
```ts
type MenuCardProps = { menu: MenuDto; onAdd: (menu: MenuDto) => void };
// soldout=true 시 className에 'is-soldout', "담기" 버튼 disabled
```

### ConfirmDialog
```ts
type ConfirmDialogProps = {
  open: boolean;
  title: string;
  body?: React.ReactNode;
  confirmLabel?: string;  // default "확인"
  cancelLabel?: string;   // default "취소"
  onConfirm: () => void;
  onCancel: () => void;
};
```

### CartItemRow
```ts
type CartItemRowProps = {
  item: CartItemDto;
  onIncrement: () => void;
  onDecrement: () => void;
  onRemove: () => void;
};
```

### AdBanner
```ts
type AdBannerProps = { ad: AdvertisementDto };
// 클릭 시 confirm "외부 사이트로 이동합니다" → window.open(ad.clickUrl, '_blank')
```

## 3. 사용자 인터랙션 흐름 (요약)

### 메뉴 → 카트 → 주문
1. MenuPage `/menu` → MenuCard "담기" 탭 → `useCartMutation.add` → 토스트 "장바구니에 담았어요" + 하단 BottomBar 항목 수 갱신
2. BottomBar 탭 → CartPage `/cart`
3. CartPage "주문 확정" 탭 → ConfirmOrderDialog (메뉴/총액 큰 글자 요약)
4. ConfirmDialog "주문하기" → `useConfirmOrder` → POST → 성공 시 `navigate('/orders')`

### 도움말
- 첫 진입 자동: `MenuPage` mount 시 `help.completedAt` 없으면 `HelpOverlay` 표시
- 헬프 버튼: 항시 PageHeader에 노출 → 클릭 시 오버레이 다시 노출

### 세션 종료 (SSE)
- `session.closed` 수신 → `useSessionToken.clear()` → `navigate('/error/session-ended')`

## 4. 폼 검증

폼 검증은 거의 없음 (대부분 read·tap 기반).

- 수량 조정: +/- 버튼만, 자유 입력 X
- 비밀번호·로그인: 관리자 영역(U3)에만 있음
- 주문 확정 직전: 카트 빈 상태면 backend가 CART_EMPTY 반환, U2는 토스트만

## 5. API 통합 지점 (컴포넌트 ↔ 백엔드)

| 컴포넌트 | 호출 |
|----------|------|
| QrEntryPage | `POST /qr/scan/:token` (api/client.ts) |
| MenuPage | `useMenuQuery()` + `useAdsQuery('menu_top'/'menu_bottom')` + `useSseChannel(sid)` |
| CartPage | `useCartQuery()` + `useCartMutation()` + `useAdsQuery('cart_bottom')` + `useSseChannel(sid)` |
| OrderHistoryPage | `useOrdersQuery()` + `useSseChannel(sid)` |

## 6. Storybook / Test ID 정책

- 모든 인터랙티브 요소에 `data-testid` 부착 — CL-5.
- 예시: `menu-card-${menuId}`, `menu-card-${menuId}-add`, `cart-item-${itemId}-plus`, `cart-clear-button`, `order-confirm-button`, `confirm-dialog-confirm`, `help-button`, `large-text-toggle`.
