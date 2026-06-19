# U2 Customer Web — Business Logic Model (v2.2)

> **Stage**: CONSTRUCTION · U2 · Functional Design Step 6 산출물 (1/4)

본 문서는 **고객 BYOD PWA의 client-side 워크플로우**를 정의한다. backend 호출 + SSE 처리 + 로컬 상태 갱신의 흐름.

---

## 1. Client Use-case 카탈로그 (12개)

| # | Client UC | 트리거 | 백엔드 호출 | 커버 스토리 |
|---|-----------|--------|-------------|-------------|
| C-UC1 | QR 진입 + 세션 토큰 발급 | `/qr/:token` route 진입 | POST `/qr/scan/:token` | US-C1.1 |
| C-UC2 | 메뉴 화면 로드 + 광고 노출 | `/menu` mount | GET `/menus`, GET `/ads?slot=menu_top`·`menu_bottom` | US-C2.1, US-C6.1 |
| C-UC3 | 카트 추가 | "담기" 탭 | POST `/sessions/:sid/cart/items` + SSE `cart.updated` | US-C3.1 |
| C-UC4 | 카트 비우기 + 총액 표시 | "장바구니 비우기" 확인 | DELETE `/sessions/:sid/cart` + SSE `cart.cleared` | US-C3.2 |
| C-UC5 | 새로고침 후 복원 | mount 시 | GET `/sessions/:sid/cart` | US-C3.3 |
| C-UC6 | 동시 편집 + SSE 동기화 | 일행 변경 수신 | SSE `cart.updated` → `setQueryData` | US-C3.4 |
| C-UC7 | 주문 확정 + 화면 이동 | "주문하기" 확인 | POST `/sessions/:sid/orders` + SSE `cart.cleared` + `order.created` | US-C4.1 |
| C-UC8 | 주문 실패 + 카트 복구 | 4xx/5xx | toast 노출, 카트 미변경 | US-C4.2 |
| C-UC9 | 테이블 내역 조회 + 실시간 추가 | `/orders` mount | GET `/orders` + SSE `order.created`/`order.deleted` | US-C5.1 |
| C-UC10 | 도움말 오버레이 노출 | 첫 진입 or 헬프 버튼 | localStorage flag | US-C0.1 |
| C-UC11 | a11y 토글 (큰 글자·고대비) | 토글 클릭 | localStorage + classList | US-C0.2 |
| C-UC12 | 세션 종료 안내 | SSE `session.closed` | 세션 토큰 폐기 + `/error/session-ended` | US-A3.3·A3.1 echo |

---

## 2. 핵심 워크플로우 G/W/T

### 2.1 C-UC1 — QR 진입

```gherkin
Given /qr/:token 라우트 진입
When QrEntryPage mount
Then POST /qr/scan/:token (X-Session-Token 있으면 헤더에 포함)
  And 응답 200 → localStorage.set(sessionToken, sessionId, storeId, storeName, tableNumber)
  And navigate('/menu', { replace: true })
  Or 응답 400 + errorCode QR_REVOKED/STORE_CLOSED → /error/scan-failed?code=...
```

### 2.2 C-UC3 — 카트 추가

```gherkin
Given 메뉴 카드 "담기" 탭
When useCartMutation.add({ menuId, quantity })
Then POST /sessions/:sid/cart/items
  And 응답 200 CartDto → queryClient.setQueryData(['cart', sid], dto)
  And toast "장바구니에 담았어요"
  Or 400 + MENU_SOLDOUT → toast "품절된 메뉴입니다." (카트 미변경)
```

### 2.3 C-UC6 — SSE cart.updated 수신

```gherkin
Given useSseChannel 활성 + 일행이 카트 변경
When EventSource 'cart.updated' 이벤트 도착
Then queryClient.setQueryData(['cart', sid], { sessionId, version, items, total })
  And 카트 화면 자동 갱신 + 강조 애니메이션 (P4 보조)
```

### 2.4 C-UC7 — 주문 확정

```gherkin
Given /cart에서 "주문 확정" 탭
When ConfirmDialog "주문하기" 확인
Then POST /sessions/:sid/orders
  And 응답 200 → queryClient.setQueryData(['cart', sid], { ... items: [], total: 0 })
  And queryClient.invalidateQueries(['orders', sid])
  And navigate('/orders') (v2.1 흐름)
  Or 400 CART_EMPTY/MENU_SOLDOUT → toast, 화면 유지
```

### 2.5 C-UC11 — a11y 토글

```gherkin
Given 사용자가 "글자 더 크게" 토글 클릭
When useAccessibility.toggleLargeText()
Then localStorage.set('a11y.largeText', '1')
  And document.documentElement.classList.add('large-text')
  And CSS 변수 --font-scale: 1.5 → 모든 rem 단위 비례 확대
  And 터치 영역 60×60px 자동 적용
```

### 2.6 C-UC12 — 세션 종료 안내

```gherkin
Given useSseChannel 활성
When 'session.closed' 이벤트 도착
Then localStorage.clear() (세션 + a11y/help 유지)
  And navigate('/error/session-ended')
  And EventSource.close()
```

---

## 3. SSE 이벤트 → 클라이언트 액션 매핑

| SSE 이벤트 | 클라이언트 액션 |
|-----------|----------------|
| `cart.updated` | `setQueryData(['cart', sid], payload)` + 토스트 "일행이 메뉴를 추가했어요" |
| `cart.cleared` | `setQueryData(['cart', sid], { ..., items: [], total: 0 })` |
| `order.created` | `setQueryData(['orders', sid], (old) => [payload.order, ...(old ?? [])])` + 강조 |
| `order.deleted` | `setQueryData(['orders', sid], (old) => old?.filter(o => o.id !== payload.orderId))` + 토스트 "매장에서 주문이 취소되었어요" |
| `menu.soldout.changed` | `invalidateQueries(['menu'])` + 카트 안 항목에 "품절" 배지 |
| `session.closed` | C-UC12 처리 |
| `keep-alive` | 무시 (연결 유지 확인용) |

---

## 4. Use-case ↔ 스토리 Traceability

| Client UC | 1차 스토리 | 보조 |
|-----------|-----------|------|
| C-UC1 | US-C1.1 | — |
| C-UC2 | US-C2.1, US-C6.1 | — |
| C-UC3 | US-C3.1 | US-A4.4 (soldout 차단) |
| C-UC4 | US-C3.2 | — |
| C-UC5 | US-C3.3 | — |
| C-UC6 | US-C3.4 | US-A4.4 |
| C-UC7 | US-C4.1 | — |
| C-UC8 | US-C4.2 | — |
| C-UC9 | US-C5.1 | US-A3.2 echo |
| C-UC10 | US-C0.1 | — |
| C-UC11 | US-C0.2 | — |
| C-UC12 | US-A3.3 echo | US-A3.1 (qr-revoked) |

12 스토리(C0.1~C6.1) 모두 커버.
