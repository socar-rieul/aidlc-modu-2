# U2 Customer Web — Code Generation Plan (v2.2)

> **Stage**: CONSTRUCTION · U2 · Code Generation Part 1 (Planning) + Part 2 (Generation)

본 plan은 U1의 "자동 진행" 흐름을 그대로 적용해 Part 1 + Part 2를 한 사이클로 묶는다.

## Section A — Unit Context

- 유닛: U2 Customer Web (`packages/customer-web`)
- 책임: 고객 BYOD 모바일 PWA (QR 진입 → 메뉴 → 공동 카트 → 주문 확정 → 테이블 내역 + 광고 + a11y + 도움말)
- 의존: `@table-order/shared` + backend localhost:3000

## Section B — 단계별 실행 (Step 1 ~ Step 12)

- [x] Step 1: 프로젝트 셋업 — package.json, vite.config.ts, tsconfig, index.html, .gitignore, .eslintrc, .prettierrc
- [x] Step 2: PWA manifest + service worker 설정 + favicon
- [x] Step 3: main.tsx + App.tsx (Providers + Routes)
- [x] Step 4: CSS 변수 토큰 (`styles/tokens.css`) + 글로벌 스타일 (`styles/global.css`)
- [x] Step 5: api/client.ts (fetch wrapper + ApiError)
- [x] Step 6: hooks/{useSessionToken, useAccessibility, useHelp, useToast, useSseChannel}
- [x] Step 7: hooks/queries — useMenuQuery, useAdsQuery, useCartQuery, useCartMutation, useOrdersQuery, useConfirmOrder
- [x] Step 8: routes/RequireSession + ErrorBoundary
- [x] Step 9: pages/QrEntryPage
- [x] Step 10: pages/MenuPage + components(PageHeader, CategoryChips, MenuCard, MenuDetailModal, AdBanner, BottomBar)
- [x] Step 11: pages/CartPage + components(CartItemRow, ConfirmDialog, TotalBar)
- [x] Step 12: pages/OrderHistoryPage + pages/HelpOverlay + pages/ErrorPage + README + 단위 테스트 1개

## Section C — 산출물 매핑

| Story | 핵심 파일 |
|-------|----------|
| US-C0.1 도움말 | `pages/HelpOverlay.tsx` + `hooks/useHelp.ts` |
| US-C0.2 a11y | `hooks/useAccessibility.tsx` + `styles/tokens.css` |
| US-C1.1 QR 입장 | `pages/QrEntryPage.tsx` + `api/client.ts` |
| US-C2.1 메뉴 | `pages/MenuPage.tsx` + `components/MenuCard.tsx` |
| US-C3.1~3.4 카트 | `pages/CartPage.tsx` + `hooks/useCartMutation.ts` + `useSseChannel` |
| US-C4.1~4.2 주문 | `pages/CartPage.tsx#ConfirmOrderDialog` + `hooks/useConfirmOrder.ts` |
| US-C5.1 내역 | `pages/OrderHistoryPage.tsx` + `useOrdersQuery` |
| US-C6.1 광고 | `components/AdBanner.tsx` + `hooks/useAdsQuery.ts` |
