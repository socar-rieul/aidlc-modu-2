# Unit of Work — Story Map (v2.2)

> **Stage**: INCEPTION · Units Generation · Part 2 산출물 (3/3)
> **Inputs**: [`unit-of-work.md`](unit-of-work.md) · [`stories.md` v2.2 (26 스토리)](../user-stories/stories.md) · [`component-methods.md`](component-methods.md)

본 문서는 **26 스토리 × 3 유닛 매핑 + 유닛별 책임 분담 + 다중 유닛 협력 traceability**를 제공한다.

표기:
- `●` = 1차 책임 유닛 (해당 스토리의 주요 구현 위치)
- `○` = 협력 유닛 (보조 기능 또는 echo)
- 빈 칸 = 무관

---

## 1. 스토리 × 유닛 매트릭스 (26 스토리)

### 1.1 고객용 (12 스토리)

| Story | 한 줄 | U1 Backend | U2 Customer | U3 Admin | 핵심 contract |
|-------|-------|:----------:|:-----------:|:--------:|---------------|
| US-C0.1 | 처음 사용자 도움말·튜토리얼 | ○ (저장만) | ● | | 클라이언트 localStorage |
| US-C0.2 | 큰 글자·고대비 토글 + 시스템 폰트 따라가기 | | ● | | rem 토큰 + localStorage |
| US-C1.1 | QR 스캔 입장 (첫 스캔 시 세션·Cart 생성) | ● | ● | ○ (session.started 수신) | POST `/qr/scan/:token` + 매장 채널 SSE |
| US-C2.1 | 메뉴 탐색·상세 + 품절 표기 | ● | ● | | GET `/menus` |
| US-C3.1 | 공동 장바구니 추가·수량·삭제 + 품절 차단 | ● | ● | ○ (SSE echo 무) | POST/PATCH/DELETE `/cart/items` + `cart.updated` SSE |
| US-C3.2 | 공동 장바구니 비우기 + 총액 | ● | ● | | DELETE `/cart` + `cart.cleared` SSE |
| US-C3.3 | 새로고침 후 공동 장바구니 복원 | ● | ● | | GET `/cart` 서버 권한 |
| US-C3.4 | 동시 편집 last-write-wins + SSE reconcile | ● | ● | | `cart.updated` 버전 단조 증가 |
| US-C4.1 | 주문 확정 + 주문 내역 화면 이동 (v2.1) | ● | ● | ○ (`order.created` 매장 채널) | POST `/orders` + 양 채널 SSE |
| US-C4.2 | 주문 실패 + 카트 복구 | ● | ● | | 4xx/5xx 응답 정책 |
| US-C5.1 | 테이블 전체 주문 내역 (시간 역순) | ● | ● | | GET `/orders` + `order.created` SSE |
| US-C6.1 | 모두의주차장 광고 슬롯 노출 | ● | ● | | GET `/ads?slot=` |

### 1.2 관리자용 (14 스토리)

| Story | 한 줄 | U1 Backend | U2 Customer | U3 Admin | 핵심 contract |
|-------|-------|:----------:|:-----------:|:--------:|---------------|
| US-A1.1 | 매장 로그인 + bcrypt | ● | | ● | POST `/admin/auth/login` |
| US-A1.2 | 1개월 세션 + 만료 자동 로그아웃 | ● | | ● | JWT 30일 + 401 → 로그인 리다이렉트 |
| US-A1.3 | 로그인 시도 제한 | ● | | ● | RateLimitGuard + 423 응답 |
| US-A2.1 | 실시간 신규 주문 SSE | ● | | ● | `/sse/stores/:storeId` + `order.created` |
| US-A2.2 | 테이블 그리드 카드 (참가자 수 제거 v2.1) | ● | | ● | GET `/admin/dashboard` |
| US-A2.3 | 주문 카드 상세 모달 (상태 컬럼 없음 v2.1) | ● | | ● | GET `/sessions/:sid/orders` admin 변형 |
| US-A3.1 | QR 발급·인쇄·재발급 | ● | | ● | POST `/admin/tables` + `:id/qr/regenerate` + GET `qr.pdf` |
| US-A3.2 | 주문 직권 삭제 + 양 채널 SSE | ● | ○ (`order.deleted` 수신) | ● | DELETE `/admin/orders/:id` |
| US-A3.3 | 세션 종료 + 참가자 토큰 일괄 무효화 (빈 세션은 history 미기록 v2.2) | ● | ○ (`session.closed` 수신) | ● | POST `/admin/tables/:id/session/close` |
| US-A3.4 | 과거 주문 내역 + 날짜 필터 | ● | | ● | GET `/admin/history` |
| US-A4.1 | 메뉴 등록 (가격 ≥1원) | ● | | ● | POST `/admin/menus` |
| US-A4.2 | 메뉴 수정·삭제 (카트에 있으면 409 v2.2) | ● | | ● | PATCH/DELETE `/admin/menus/:id` |
| US-A4.3 | 메뉴 노출 순서 조정 | ● | | ● | PATCH `/admin/menus/sort` |
| US-A4.4 | **품절 토글** (활성 세션 전체 SSE) | ● | ○ (`menu.soldout.changed` 수신) | ● | PATCH `/admin/menus/:id/soldout` + 세션 채널 fan-out |

**합계**: 26 스토리 모두 매핑 완료. **U1 단독 책임 = 0**, **U1 + U2 공동 = 11**, **U1 + U3 공동 = 11**, **U1 + U2 + U3 3자 협력 = 4** (US-C4.1, US-A3.2, US-A3.3, US-A4.4), **U2 단독 = 1** (US-C0.2 — 클라이언트 a11y 토글).

---

## 2. 다중 유닛 협력 시나리오 4개

요구사항·UI·실시간 동기화가 세 유닛 모두에 영향을 주는 핵심 use-case. Construction 단계에서 통합 e2e 테스트 대상.

### 2.1 US-C4.1 — 주문 확정 + 매장 대시보드 즉시 반영

- U2(고객 폰)이 POST `/orders` → U1이 Cart→Order 트랜잭션 + 양 채널 SSE → U2(같은 테이블 전원), U3(매장) 동시 갱신.
- 첫 주문일 경우 U1이 추가로 `session.started`를 매장 채널에 발화? **v2.2에서는 NO** — 스캔 시점에 이미 발화됨.
- 핵심 시퀀스: [`component-dependency.md` §4.3](component-dependency.md#43-시퀀스-3--주문-확정--관리자-대시보드-갱신-us-c41--us-a21).

### 2.2 US-A3.2 — 직권 삭제 양 채널 SSE 동기화

- U3에서 DELETE `/admin/orders/:id` → U1이 양 채널에 `order.deleted` → U2/U3 화면에서 즉시 행 제거.
- 고객 측엔 토스트("매장에서 주문이 취소되었어요") 동반.

### 2.3 US-A3.3 — 세션 종료 + 참가자 토큰 일괄 무효화

- U3에서 POST `/admin/tables/:id/session/close` → U1이 트랜잭션 (TableSession.status=CLOSED + Order → OrderHistory + Cart clear + SessionParticipant.revokedAt 일괄).
- v2.2 정합성: **활성 세션이지만 주문 0건이면 OrderHistory 미기록** (movedOrders=0). 안내 토스트는 U3, "이용이 종료되었습니다"는 U2.
- U1이 양 채널에 `session.closed` 발화.

### 2.4 US-A4.4 — 메뉴 품절 토글 + 활성 세션 전체 fan-out

- U3에서 PATCH `/admin/menus/:id/soldout` → U1이 Menu.soldout 갱신 + 매장 모든 활성 세션 sessionId 조회 → 각 세션 채널에 `menu.soldout.changed` 발화 + 매장 채널에도 echo.
- U2는 메뉴 카드 회색 처리 + 카트의 동일 항목에 "품절" 표시 (담은 후 품절 전환 시).
- 다음 주문 확정 시점에 U1이 assertNotSoldout으로 거부.

---

## 3. Story ↔ Module ↔ Endpoint Traceability (요약 표)

| Story | NestJS 모듈 (U1) | Customer 페이지/훅 (U2) | Admin 페이지/훅 (U3) | REST | SSE 이벤트 |
|-------|------------------|--------------------------|-----------------------|------|-------------|
| US-C0.1 | — | HelpOverlay | — | — | — |
| US-C0.2 | — | LargeTextToggle / useAccessibility | — | — | — |
| US-C1.1 | TableModule | QrEntryPage / useSessionToken | — | POST /qr/scan/:token | session.started (스캔 시) |
| US-C2.1 | MenuModule + AdsModule | MenuPage / useMenuQuery | — | GET /menus, /ads | menu.soldout.changed |
| US-C3.1 | CartModule + MenuModule + SseModule | CartContainer / useCartMutation | — | POST/PATCH/DELETE /cart/items | cart.updated |
| US-C3.2 | CartModule + SseModule | CartContainer | — | DELETE /cart | cart.cleared |
| US-C3.3 | CartModule | useCartQuery | — | GET /cart | — |
| US-C3.4 | CartModule + SseModule | useSseChannel | — | — | cart.updated (재연결 reconcile) |
| US-C4.1 | OrderModule + TableModule + CartModule + MenuModule + SseModule | ConfirmDialog / useConfirmOrder / OrderHistoryPage | DashboardPage (수신만) | POST /orders | cart.cleared + order.created (양 채널) |
| US-C4.2 | OrderModule | useConfirmOrder error path | — | POST /orders (4xx/5xx) | — |
| US-C5.1 | OrderModule | OrderHistoryPage / useOrdersQuery | — | GET /orders | order.created (실시간 추가) |
| US-C6.1 | AdsModule | AdSlotContainer / AdBanner | — | GET /ads?slot= | — |
| US-A1.1 | AuthModule | — | LoginPage / useAdminAuth | POST /admin/auth/login | — |
| US-A1.2 | AuthModule | — | useAdminAuth (만료 감지) | — | — |
| US-A1.3 | AuthModule + CommonModule (RateLimitGuard) | — | LoginPage (423 처리) | POST /admin/auth/login | — |
| US-A2.1 | SseModule + AdminModule | — | TableGridContainer / useSseChannel | GET /admin/dashboard | order.created (매장 채널) |
| US-A2.2 | AdminModule | — | TableCard | GET /admin/dashboard | — |
| US-A2.3 | AdminModule + OrderModule | — | OrderDetailModalContainer | GET admin orders | — |
| US-A3.1 | TableModule | — | QrIssueDialog / useRegenerateQr | POST /admin/tables + /qr/regenerate + GET qr.pdf | — |
| US-A3.2 | OrderModule + SseModule | OrderHistoryPage (수신만) | OrderModal / useDeleteOrder | DELETE /admin/orders/:id | order.deleted (양 채널) |
| US-A3.3 | TableModule + OrderModule + CartModule + SseModule | QrEntryPage 안내 (수신만) | SessionCloseButton / useCloseSession | POST .../session/close | session.closed (양 채널) |
| US-A3.4 | OrderModule | — | HistoryTableContainer / useHistoryQuery | GET /admin/history | — |
| US-A4.1 | MenuModule | — | MenuRow 등록 폼 | POST /admin/menus | — |
| US-A4.2 | MenuModule + CartModule (409 검증) | — | MenuRow 수정/삭제 | PATCH/DELETE /admin/menus/:id | — |
| US-A4.3 | MenuModule | — | MenuManagementPage 정렬 | PATCH /admin/menus/sort | — |
| US-A4.4 | MenuModule + SseModule + TableModule (활성 세션 조회) | MenuCard / CartItemRow (수신만) | SoldoutToggle / useToggleSoldout | PATCH /admin/menus/:id/soldout | menu.soldout.changed (세션 fan-out + 매장 echo) |

---

## 4. 유닛별 스토리 카운트 요약

| 유닛 | 1차 책임 스토리 | 협력 스토리 | 합계 |
|------|------------------|-------------|------|
| **U1 Backend** | 25 (모든 스토리에서 ●; US-C0.1 ○, US-C0.2 무관) | — | 25 + 1 |
| **U2 Customer Web** | 12 | 4 (US-A3.2·A3.3·A4.4·A2.1 echo 수신) | 16 |
| **U3 Admin Web** | 14 | 2 (US-C1.1 session.started·US-C4.1 order.created 수신) | 16 |
| **shared** | — | 26 (전 스토리의 DTO·SSE 타입 정의) | 26 (참여) |

- U1이 가장 무거운 유닛 (25/26 스토리에 1차 또는 보조 참여). 워크샵 PoC라도 Functional Design / NFR 비중이 U1에 집중.
- U2·U3 각각 12~14 스토리로 비교적 균형.
- shared는 전 스토리에 contract 제공.

---

## 5. Construction Phase 진입 점검 체크리스트

본 Units Generation 단계 완료 후 다음을 확인:

- [x] 모든 스토리가 ≥ 1개 유닛에 매핑됨 (26/26).
- [x] 다중 유닛 협력 시나리오 4개 식별됨 — Construction 단계 통합 테스트 대상.
- [x] 빌드/실행 순서 정의됨 ([`unit-of-work-dependency.md` §3](unit-of-work-dependency.md#3-빌드실행-순서)).
- [x] Code Generation 순서 정의됨 — 순차 U1 → U2 → U3.
- [x] 통신 contract SSOT 위치 확정 — shared 패키지 + Application Design 문서.

다음 단계: **CONSTRUCTION PHASE - U1 Backend Functional Design**.
