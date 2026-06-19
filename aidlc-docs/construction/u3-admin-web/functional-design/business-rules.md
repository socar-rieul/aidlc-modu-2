# U3 Admin Web — Business Rules (v2.2)

> **Stage**: CONSTRUCTION · U3 · Functional Design Step 6 산출물 (2/4)

---

## 1. Client 룰

| ID | 룰 |
|----|----|
| **AL-1** | JWT는 `localStorage.tableOrder.admin.jwt`에만 보관. fetch 요청에 `Authorization: Bearer …` 자동 부착. |
| **AL-2** | JWT 만료시각(`tableOrder.admin.expiresAt`)을 mount 시 비교 → 만료면 `clearAuth() + navigate('/login')`. |
| **AL-3** | 401 응답 → 토큰 폐기 + `/login` 리다이렉트 + 토스트 "세션이 만료되었습니다." |
| **AL-4** | 사전 검증 — 가격 ≥ 1원, 테이블 번호 ≥ 1, 빈 문자열 metadata 금지. |
| **AL-5** | errorCode 매핑 — `LOGIN_FAILED` / `LOGIN_RATE_LIMITED` / `MENU_PRICE_INVALID` / `MENU_IN_CART` / `TABLE_NUMBER_DUPLICATE` / `SESSION_INACTIVE` / `ORDER_IN_HISTORY` 등 → 한국어 토스트. |
| **AL-6** | 모든 위험 액션(QR 재발급·세션 종료·주문 삭제·메뉴 삭제)은 ConfirmDialog 1단계 필수. |
| **AL-7** | QR 다운로드는 Bearer fetch → Blob → 임시 `<a download>` 트리거. URL revoke. |
| **AL-8** | SSE 매장 채널 끊김 후 자동 재연결(EventSource 기본). `onopen`에서 `invalidate(['dashboard'])`로 reconcile. |
| **AL-9** | data-testid: 페이지/액션 별 부여. 예: `login-submit`, `table-card-${id}`, `menu-row-${id}`, `qr-download-${tableId}-png`. |

## 2. 에러 메시지 매핑

| errorCode | 메시지 |
|-----------|--------|
| `LOGIN_FAILED` | "매장ID·사용자명·비밀번호를 확인해주세요." |
| `LOGIN_RATE_LIMITED` | "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요." |
| `VALIDATION_FAILED` | "입력값을 확인해주세요." |
| `MENU_PRICE_INVALID` | "가격은 1원 이상이어야 합니다." |
| `MENU_IN_CART` | "이 메뉴는 손님 카트에 담겨 있어요. 손님이 비울 때까지 삭제할 수 없습니다." |
| `MENU_NOT_FOUND` | "메뉴를 찾을 수 없습니다." |
| `TABLE_NOT_FOUND` | "테이블을 찾을 수 없습니다." |
| `TABLE_NUMBER_DUPLICATE` | "이미 같은 번호의 테이블이 있습니다." |
| `SESSION_INACTIVE` | "종료할 활성 세션이 없습니다." |
| `ORDER_NOT_FOUND` | "주문을 찾을 수 없습니다." |
| `ORDER_IN_HISTORY` | "이미 종료된 테이블의 주문은 수정할 수 없습니다." |
| `INTERNAL` / 500 | "잠시 후 다시 시도해주세요." |

## 3. 라우트 정책

| 라우트 | 가드 |
|--------|------|
| `/login` | 없음 (이미 로그인 상태면 `/` 리다이렉트) |
| `/`, `/menus`, `/tables`, `/history` | RequireAuth |
| 그 외 | 404 → `/` 또는 `/login` |
