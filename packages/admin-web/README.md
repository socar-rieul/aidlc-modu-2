# @table-order/admin-web (U3)

React 18 + Vite + TanStack Query + react-router-dom 기반의 매장 관리자 데스크톱 SPA.

## Quick Start

```bash
pnpm install
pnpm --filter @table-order/shared build
pnpm --filter @table-order/backend dev   # port 3000
pnpm --filter @table-order/admin-web dev # port 5174
```

브라우저로 진입 → <http://localhost:5174/login>

데모 계정: 매장ID `00000000-0000-0000-0000-000000000001` / `owner` (또는 `crew`) / `demo1234`

## 라우트

- `/login` — 매장 로그인
- `/` — 대시보드 (테이블 그리드 + 매장 채널 SSE + 주문 상세 모달)
- `/menus` — 메뉴 CRUD + 정렬 + 품절 토글
- `/tables` — 테이블 추가 + QR PNG/SVG 다운로드 + QR 재발급 + 세션 종료
- `/history` — 과거 주문 내역 + 날짜 필터

## 핵심 동작

- JWT 30일 + 만료 자동 폐기 + 401 → `/login`
- 매장 채널 SSE → `invalidateQueries(['dashboard'])` 위주 + 신규 주문 토스트
- QR 다운로드 = Bearer fetch → Blob → `<a download>` 트리거
- 위험 액션(세션 종료·QR 재발급·주문 삭제·메뉴 삭제) ConfirmDialog 1단계

## 테스트

```bash
pnpm --filter @table-order/admin-web test
```
