# U1 Backend — Functional Design Plan (v2.2)

> **Stage**: CONSTRUCTION · U1 Backend · Functional Design Step 1~5 산출물 (Planning)
> **Prior context**: [`unit-of-work.md`](../../inception/application-design/unit-of-work.md) · [`unit-of-work-story-map.md`](../../inception/application-design/unit-of-work-story-map.md) · [`components.md`](../../inception/application-design/components.md) · [`component-methods.md`](../../inception/application-design/component-methods.md) · [`services.md`](../../inception/application-design/services.md) · [`component-dependency.md`](../../inception/application-design/component-dependency.md) · [`stories.md` v2.2](../../inception/user-stories/stories.md)
> **Unit scope**: U1 Backend (`packages/backend`) — NestJS 도메인 모듈 9개 + Common + 13 엔티티 + REST 27 + SSE 11 이벤트. 25/26 스토리 책임.

본 plan은 AI-DLC construction/functional-design.md Step 2(plan 생성) ~ Step 5(ambiguity 해소) 산출물이다. Step 6에서 3종 산출물(business-logic-model / business-rules / domain-entities)을 생성한다.

---

## Section A — 핵심 비즈니스 결정 (Embedded Questions)

Application Design 단계에서 대부분의 결정이 명확히 정의됐다(엔티티·서비스 메서드·SSE 이벤트·CR-1~CR-7 + v2.2 정합성 6건). Functional Design은 그것을 G/W/T 비즈니스 룰로 구체화하는 단계. 추가로 결정이 필요한 minor 사항만 묻는다.

### Q1 — HTTP 에러 코드 카탈로그

**맥락**: 비즈니스 오류 분류·클라이언트 핸들링 일관성. stories.md AC에 일부 명시(품절=409, 매장 종료=403)되어 있으나 통합 정책은 없음.

권장안:

| 코드 | 상황 | 예시 endpoint |
|------|------|----------------|
| 400 Bad Request | DTO 검증 실패·빈 카트 주문 확정 시도·가격 ≤ 0 등 비즈니스 사전 검증 실패 | POST `/admin/menus` (가격 0), POST `/sessions/:sid/orders` (카트 비어있음) |
| 401 Unauthorized | JWT 만료·세션 토큰 무효 | 모든 `/admin/**`, `/sessions/**` |
| 403 Forbidden | 스코프 위반(타 매장·타 세션)·QR 무효·매장 영업 종료·QR 발급 매장 미존재 | POST `/qr/scan/:token` (영업 종료) |
| 404 Not Found | 리소스 미존재 (메뉴·테이블·주문) | DELETE `/admin/orders/:id` (없는 id) |
| 409 Conflict | 비즈니스 룰 충돌 — 품절 메뉴 카트 추가·메뉴 삭제 시 카트에 포함됨·테이블 중복 번호 | POST `/cart/items` (soldout), DELETE `/admin/menus/:id` (카트에 있음) |
| 423 Locked | 로그인 시도 제한 초과 일시 차단 | POST `/admin/auth/login` |
| 500 Internal | 예상 외 오류 (DB·시스템) | (catch-all) |

응답 본문 공통 포맷: `{ statusCode, message, errorCode }` (NestJS `HttpException` 필터). `errorCode`는 클라이언트가 다국어 메시지를 만들 수 있도록 enum string (예: `MENU_SOLDOUT`, `CART_EMPTY`, `STORE_CLOSED`).

옵션:
- **A. 권장 카탈로그 그대로 채택**
- **B. 단순화 — 4xx 통합, errorCode만 구분 (200 / 4xx / 5xx)**
- **C. 일부 수정 — 어느 항목을?**

**[Answer]: B. 단순화 — 4xx 통합** (사용자 명시).
- **명확화**: 인증·인가 가드의 NestJS 표준 응답(JWT 만료 = 401, 스코프 위반 = 403)은 **표준 그대로 유지** — 가드는 프레임워크 표준 메커니즘이고 통합 대상 아님. **비즈니스 사전 검증 실패만 400 + errorCode 통합**.
- 통합 errorCode 카탈로그: `MENU_SOLDOUT`, `CART_EMPTY`, `CART_HAS_DELETED_MENU`, `MENU_IN_CART` (메뉴 삭제 충돌), `STORE_CLOSED`, `QR_REVOKED`, `SESSION_INACTIVE`, `ORDER_NOT_FOUND`, `ORDER_IN_HISTORY` (종료 세션 직권 삭제 시도), `MENU_PRICE_INVALID`, `TABLE_NUMBER_DUPLICATE`, `LOGIN_RATE_LIMITED` (옵션: 423 대신 400+errorCode).
- 응답 본문 공통: `{ statusCode: 400, message: "사람용 메시지", errorCode: "ENUM_STRING" }`. 클라이언트는 `errorCode`로 화면별 안내 매핑.

---

### Q2 — QR 재발급 시 활성 세션 처리 (US-A3.1)

**맥락**: stories.md US-A3.1 마지막 시나리오: "외부 노출 의심 시 무효화·재발급. 기존 QR로 진입한 활성 세션 토큰도 일괄 무효화." 그런데 활성 세션 자체는 어떻게? (a) 활성 세션도 즉시 종료(history 이동) / (b) 활성 세션 유지하고 신규 참가자 합류만 막음 / (c) 활성 세션 유지 + 기존 참가자 토큰 무효화로 합류 차단(현재 손님은 사실상 새로 스캔해야 함).

옵션:
- **A. 권장 — 활성 세션 강제 종료 + OrderHistory 이동 + 토큰 일괄 무효화** (CR-2 closeActiveSession 호출과 동일 cascade). "외부 노출"이라는 사용자 의도 = 처음부터 다시 시작이 자연스러움. 빈 세션이면 history 미기록(v2.2).
- **B. 활성 세션 유지 + 기존 SessionParticipant 토큰만 무효화** (재진입 시 새 토큰). 진행 중 주문은 보호되지만 카트 상태가 손님 측에서 사라짐 → 혼란.
- **C. 활성 세션 유지 + 토큰도 유지** (재발급 = qrToken 새 발급일 뿐, 진행 중 세션 영향 없음). 가장 보수적이지만 보안 의도와 안 맞음.

**[Answer]: A. 강제 종료** — TableService.regenerateQr 내부에서 `closeActiveSession`을 명시적으로 호출 → cascade 동일 (TableSession status=CLOSED + 빈 세션이면 history 미기록·아니면 이동 + Cart clear + SessionParticipant revokedAt 일괄). 그 후 새 `qrToken` 발급. 세션 채널에 `session.closed { reason: 'qr-revoked' }`, 매장 채널에 `session.closed`도 발화.

---

### Q3 — 관리자 주문 직권 삭제 가능 시점 (US-A3.2)

**맥락**: stories.md US-A3.2: "특정 주문을 삭제, 손님 폰에도 즉시 반영." 그런데 활성 세션의 주문만 삭제 가능한지, 이미 종료된 OrderHistory의 주문도 삭제 가능한지 명시 안 됨.

옵션:
- **A. 권장 — 활성 세션 주문만 직권 삭제 가능** (OrderHistory는 read-only). 종료된 세션은 정산 완료 가정 → 변경 차단. 종료된 세션 주문 삭제 시 403 또는 409.
- **B. OrderHistory도 직권 삭제 가능** (history.summary JSON 갱신). 운영 편의 ↑, 정산 무결성 ↓.
- **C. 활성·종료 모두 삭제 가능하지만 종료 세션은 별도 confirm 다이얼로그** (운영 책임 강조).

**[Answer]: A. 활성 세션만** — `OrderService.deleteByAdmin`은 Order의 TableSession이 `status=ACTIVE`인 경우에만 실행. 종료된 세션의 주문 삭제 시도는 400 + `errorCode: ORDER_IN_HISTORY` 반환.

---

## Section B — Step 6 산출물 계획 (체크리스트)

위 3문항 답변 확정 후 다음을 작성한다.

- [ ] B1. `construction/u1-backend/functional-design/business-logic-model.md`
  - 핵심 use-case 워크플로우 8개의 데이터 변환·트랜잭션 경계·SSE 발화 시점(WHAT)
  - Application Design services.md §2의 5 use-case에 더해 **세션 종료 빈 세션 case(v2.2)·QR 재발급 cascade(Q2 답변)·직권 삭제 가능 시점(Q3 답변)·메뉴 삭제 카트 충돌(v2.2 409)** 등 추가 워크플로우 명시.
- [ ] B2. `construction/u1-backend/functional-design/business-rules.md`
  - CR-1~CR-7 cross-cutting 룰
  - 도메인별 비즈니스 룰 (Auth / Table·Session / Menu / Cart / Order / SSE / Ads / Admin)
  - 검증 룰 — class-validator 데코레이션 매핑 + 비즈니스 사전 검증 (assertNotSoldout, assertCartNotEmpty, assertActiveSession 등)
  - HTTP 에러 코드 카탈로그 (Q1 답변)
- [ ] B3. `construction/u1-backend/functional-design/domain-entities.md`
  - 13 엔티티 상세 — 컬럼·인덱스·제약(unique·non-null·default)·관계 cascade·라이프사이클(생성·갱신·종료 조건)
  - TypeORM 데코레이션 매핑 + 마이그레이션 영향
- [ ] B4. `aidlc-state.md` U1 Functional Design [x] + Current Stage 갱신
- [ ] B5. `audit.md` Step 6 완료 + 산출물 목록 로그
- [ ] B6. Step 7 Completion Message 사용자 제시 → 승인 대기

> **참고**: U1은 backend-only라 `frontend-components.md`는 작성하지 않는다 (룰 Step 6 조건부).

---

## Section C — Ambiguity Resolution (Step 5)

답변 수집 직후 본 섹션을 채워 vague/contradictory/missing 응답 점검.

- **Vague**: Q1 "단순화 (4xx 통합)"의 인증 가드 응답 포함 여부 ambiguity 인지. **해소**: 가드 표준 응답(401·403)은 프레임워크 표준 메커니즘이므로 통합 대상에서 제외, 비즈니스 사전 검증 실패만 400+errorCode 통합으로 plan에 명확화 기입. 사용자 명시 의도와 합리 부합.
- **Contradictory**: 없음. Q2 강제 종료(A) + Q3 활성 세션만 삭제(A)는 CR-2 라이프사이클과 일관.
- **Missing**: 423(rate-limited)을 어떻게 표현할지 — 사용자 단순화 선택과 일관성을 위해 **400 + errorCode: `LOGIN_RATE_LIMITED`** + 응답 header에 `Retry-After`로 통합 처리. business-rules.md에 명시.
- **Follow-up [Answer]:** 불필요 — Step 6 산출물 생성으로 진행.
