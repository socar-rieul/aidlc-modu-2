# @table-order/customer-web (U2)

React 18 + Vite + TanStack Query + react-router-dom + vite-plugin-pwa 기반의 고객 BYOD PWA.

## Quick Start

```bash
# 루트에서 — 먼저 backend가 켜져 있어야 함
pnpm install
pnpm --filter @table-order/shared build   # 처음 1회
pnpm --filter @table-order/backend dev    # 다른 터미널 (port 3000)
pnpm --filter @table-order/customer-web dev   # port 5173
```

브라우저로 진입:
1. backend seed가 적용됐는지 확인 (`pnpm seed`)
2. backend에서 데모 매장 테이블의 qrToken을 가져오기 (`/admin/dashboard` 또는 SQLite)
3. <http://localhost:5173/qr/{qrToken}> 으로 진입

## 라우트

- `/qr/:token` — QR 스캔 진입 + 세션 발급 → `/menu` 리다이렉트
- `/menu` — 메뉴 + 광고 + 카트 BottomBar (RequireSession)
- `/cart` — 카트 + 비우기/주문 확정 (RequireSession)
- `/orders` — 테이블 전체 주문 내역 (RequireSession)
- `/help` — 도움말 오버레이 (RequireSession)
- `/error/:code` — `no-session` / `scan-failed` / `session-ended`

## a11y 토글

- **가** 버튼 → 글자 크기 1.5배 + 터치 영역 60×60px
- **◐** 버튼 → 고대비 모드 (검정 배경 + 노랑 강조)
- 두 설정 모두 본인 폰 localStorage에 영구 저장

## SSE

`/sse/sessions/:sid` 자동 구독 → cart.updated · cart.cleared · order.created · order.deleted · menu.soldout.changed · session.closed 처리.

## 테스트

```bash
pnpm --filter @table-order/customer-web test
```
