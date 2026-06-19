# U2 Customer Web — Business Rules (v2.2)

> **Stage**: CONSTRUCTION · U2 · Functional Design Step 6 산출물 (2/4)

---

## 1. Client 룰 카탈로그

| ID | 룰 |
|----|----|
| **CL-1** | 세션 토큰은 `localStorage.sessionToken` 한 곳에만 보관. fetch 요청에 `X-Session-Token` 헤더 자동 부착. |
| **CL-2** | 401/403 응답 → 토큰 폐기 + `/error/session-ended`. EventSource 닫음. |
| **CL-3** | 4xx 응답의 `errorCode`로 화면별 메시지 매핑 — VALIDATION_FAILED·MENU_SOLDOUT·CART_EMPTY·CART_HAS_DELETED_MENU·QR_REVOKED·STORE_CLOSED 등. |
| **CL-4** | SSE 수신 시 캐시 갱신은 `setQueryData` 우선(동일 dto), `invalidateQueries`는 재fetch 필요 시. |
| **CL-5** | 모든 인터랙티브 요소(버튼·카드·토글)에 `data-testid` 속성 부착. 예: `menu-card-${menuId}`, `cart-add-button`, `order-confirm-button`. |
| **CL-6** | 폰트 단위 `rem`만 사용. CSS 변수 `--font-scale` 곱하기로 a11y 큰 글자 모드 구현. |
| **CL-7** | 터치 영역 최소 44×44px (기본), 큰 글자 모드 켜지면 60×60px. |
| **CL-8** | EventSource 재연결 직후 `onopen` 핸들러가 `['cart', sid]` + `['orders', sid]` invalidate로 reconcile. |
| **CL-9** | 도움말 완료 플래그(`help.completedAt`)는 세션 종료(SSE `session.closed`) 시 초기화. |
| **CL-10** | "주문 확정" 버튼은 항상 ConfirmDialog 1단계 거침 (60×60 버튼). 큰 글자 모드면 폰트 추가 확대. |

## 2. 에러 메시지 매핑 (errorCode → 한국어 표시)

| errorCode | 화면 메시지 |
|-----------|-------------|
| `QR_REVOKED` | "QR이 만료되었어요. 직원을 호출해주세요." |
| `STORE_CLOSED` | "매장이 영업 중이 아닙니다." |
| `MENU_SOLDOUT` | "품절된 메뉴입니다." |
| `CART_EMPTY` | "장바구니가 비어 있습니다." |
| `CART_HAS_DELETED_MENU` | "장바구니에 더 이상 판매하지 않는 메뉴가 있어요." |
| `VALIDATION_FAILED` | "입력값을 확인해주세요." |
| `INTERNAL` / 500 | "잠시 후 다시 시도해주세요." |
| (네트워크 단절) | "주문에 실패했어요. 잠시 후 다시 시도해주세요." (US-C4.2) |

## 3. 토스트 정책

- 일반 정보: 2초 자동 닫힘
- 에러: 4초 (사용자 확인 필요)
- "일행이 변경했어요" 류 SSE 알림: 1.5초 (방해 최소화)
- a11y 큰 글자 모드: 토스트 폰트도 비례 확대

## 4. 라우트 정책

| 라우트 | 가드 |
|--------|------|
| `/qr/:token` | 가드 없음 |
| `/menu`, `/cart`, `/orders`, `/help` | `RequireSession` (토큰 없으면 `/error/no-session`) |
| `/error/*` | 가드 없음 |
| 그 외 | 404 → `/error/no-session` 리다이렉트 |
