# Application Design — 테이블오더 서비스 (v2) [통합]

> **Stage**: INCEPTION · Application Design · Step 10 산출물 (통합)
> **Inputs**: [`requirements.md` v2](../requirements/requirements.md) · [`stories.md` v2](../user-stories/stories.md) · [`personas.md` v2](../user-stories/personas.md) · [`execution-plan.md`](../plans/execution-plan.md) · [`application-design-plan.md`](../plans/application-design-plan.md)
> **확정 스택**: TypeScript · NestJS(도메인별 모듈) · React + TanStack Query · TypeORM + SQLite · class-validator · pnpm workspaces · JWT(30일)·bcrypt · SSE · UUIDv4(QR)

본 문서는 Application Design 단계의 네 개 산출물을 **단일 문서로 통합 요약**한다. 상세는 각 링크 참조.

- [`components.md`](components.md) — 컴포넌트 카탈로그·엔티티
- [`component-methods.md`](component-methods.md) — REST·SSE·서비스 시그니처
- [`services.md`](services.md) — 오케스트레이션·cross-cutting
- [`component-dependency.md`](component-dependency.md) — 의존 매트릭스·시퀀스 다이어그램 3개

---

## 1. 시스템 개요

테이블오더 서비스 v2는 **BYOD(고객 본인 폰) + 영구 QR + 공동 장바구니 + SSE 실시간 동기화 + 단방향 광고**를 핵심으로 한다. 워크샵 PoC로 로컬 단일 머신에서 실행되며, 다음 3개 유닛으로 분해된다.

| 유닛 | 패키지 | 책임 | 기술 |
|------|--------|------|------|
| **U1 Backend** | `packages/backend` | REST + SSE + 도메인 로직 + SQLite 영속 | NestJS · TypeORM · class-validator · JWT · bcrypt |
| **U2 Customer Web** | `packages/customer-web` | BYOD 고객 모바일 PWA | React · TanStack Query · vite · service worker |
| **U3 Admin Web** | `packages/admin-web` | 관리자 데스크톱 SPA | React · TanStack Query · vite |
| **(공유)** | `packages/shared` | DTO + SSE 이벤트 타입 | TypeScript only |

전체는 **pnpm workspaces** 단일 레포로 관리.

---

## 2. 디자인 결정 요약 (Application Design Plan 답변)

| ID | 결정 | 근거 |
|----|------|------|
| Q1 | **NestJS 도메인별 모듈** (9개 도메인 + 1 Common) | 정석 패턴, 25 스토리 규모, Functional Design per-unit 매핑 쉬움 |
| Q2 | **REST + 공유 DTO** (`packages/shared`) | Swagger UI 디버깅 + TypeScript 타입 안전성 |
| Q3 | **TypeORM** | NestJS 공식 통합, 데코레이터 기반, 마이그레이션 도구 내장 |
| Q4 | **class-validator + class-transformer** | Q3에 매칭, DTO 데코레이션 통일 |
| Q5 | **TanStack Query + useState** | SSE → setQueryData 캐시 갱신 자연스러움 |
| Q6 | **pnpm workspaces** | 의존 격리·디스크 효율 ↑, 4 패키지 관리 단순화 |

---

## 3. Backend NestJS 모듈 9 + Common (요약)

| Module | 책임 | 커버 스토리 |
|--------|------|-------------|
| AuthModule | 관리자 로그인·JWT 30일·bcrypt·시도 제한 | US-A1.* |
| StoreModule | 매장 마스터·StoreScopeGuard 제공 | (cross-cutting) |
| TableModule | 테이블·QR·세션·SessionParticipant·일괄 무효화 | US-C1.1, A3.1, A3.3 |
| MenuModule | 메뉴 CRUD·정렬·**품절 토글** | US-C2.1, A4.* |
| CartModule | 공동 장바구니·서버 권한 버전·last-write-wins | US-C3.* |
| OrderModule | 주문 확정·스냅샷·내역·직권 삭제·History 이동 | US-C4.*, C5.1, A3.2, A3.4 |
| SseModule | 두 채널(session / store) + EventEmitter2 라우팅 | (cross-cutting) |
| AdsModule | 모두의주차장 단방향 배너 | US-C6.1 |
| AdminModule | 대시보드 그리드 read-only orchestration | US-A2.* |
| CommonModule | 가드(JwtAuthGuard, QrTokenGuard, StoreScopeGuard, SessionScopeGuard, RateLimitGuard) · 인터셉터 | (cross-cutting) |

---

## 4. 데이터 모델 13 엔티티

`Store, StoreUser, Table, TableSession, SessionParticipant, Cart, CartItem, Order, OrderItem, OrderHistory, Menu, MenuCategory, Advertisement`.

핵심 룰:

- **CR-1 매장ID 스코프**: 모든 read/write에 storeId 가드 강제
- **CR-2 세션 라이프사이클**: 첫 주문 시점 생성 ~ 매장 이용 완료 처리. 종료 시 OrderHistory 이동 + 모든 참가자 토큰 무효화
- **CR-3 현재 세션 가시성**: 종료 세션은 고객 측 미노출
- **CR-4 주문 스냅샷**: OrderItem이 menuName·unitPrice 복사 보존 → 이후 Menu 변경 무관
- **CR-5 토큰·비밀번호**: QR=UUIDv4, JWT 30일, bcrypt
- **CR-6 공동 장바구니 동시성**: 서버 권한 + Cart.version 단조 증가 + last-write-wins + SSE 브로드캐스트
- **CR-7 광고 단방향**: 시드 데이터에서만 read, 매장별 분기 없음

---

## 5. 통신 패턴

- **REST**: 모든 쓰기·읽기 표준 (Customer/Admin → Backend)
- **SSE**: 두 채널 — `/sse/sessions/:sessionId` (고객 폰), `/sse/stores/:storeId` (관리자 대시보드)
- **EventEmitter2**: Backend 내부 도메인 ↔ SseService 디커플링
- **localStorage**: 고객은 세션 토큰 + a11y 설정만, 관리자는 JWT + 만료시각

핵심 시퀀스 3개:

1. **QR 스캔 입장** — Customer Web → TableService.scanQr → SessionParticipant 발급 → 메뉴 화면
2. **공동 장바구니 추가** — Cart 행 lock → version+1 → COMMIT → 세션 채널 SSE 브로드캐스트 (≤2초)
3. **주문 확정** — Order 트랜잭션 (Cart→Order 스냅샷) → 세션 채널 + 매장 채널 SSE 동시 발화 → 관리자 대시보드 즉시 갱신

상세 다이어그램은 [`component-dependency.md` §4](component-dependency.md#4-핵심-use-case-시퀀스-다이어그램-3개).

---

## 6. NFR 매핑

| NFR | 충족 메커니즘 |
|-----|---------------|
| NFR-1 SSE ≤2초 | 트랜잭션 commit 직후 SseService.emit. keep-alive 15초로 idle 차단 방지. |
| NFR-2 관리자 30일 세션 | JWT exp=30일, 만료 응답 401 → 클라이언트 자동 logout |
| NFR-3 보안 최소선 | bcrypt 해시, RateLimitGuard, UUIDv4 QR |
| NFR-4 / NFR-11 모바일 a11y·반응형 | rem 토큰 + 큰 글자/고대비 토글 + 320~480px 최적화 + PWA manifest |
| NFR-5 localStorage 정책 | 클라이언트 세션 토큰만, 카트·주문은 서버 권한 |
| NFR-6 SSE 전송 | 두 채널 구조 + EventSource 자동 재연결 + reconcile fetch |
| NFR-7 데이터 격리 | StoreScopeGuard + SessionScopeGuard 모든 보호 경로 적용 |
| NFR-8 Local-only | npm/pnpm 한 줄 기동, 광고는 시드 데이터 (외부 API 호출 X) |
| NFR-9 Java 금지 | TypeScript 전체 |
| NFR-10 Testability | NestJS DI + EventEmitter2 mock 용이 |
| NFR-12 공동 장바구니 동시성 | DB row lock + Cart.version 단조 증가 + last-write-wins + SSE reconcile |

---

## 7. 다음 단계 (Units Generation 이후 전망)

본 Application Design 단계 완료 후 CONSTRUCTION 진입 전 **Units Generation**으로 3 유닛 분해 확정. 각 유닛에서:

- **Functional Design (per-unit)**: 본 문서의 메서드 시그니처별 비즈니스 룰 G/W/T 정의
- **NFR Requirements / Design (per-unit)**: NFR 매핑(§6) 별 패턴 결정 — last-write-wins 구현 패턴, rem 토큰 시스템, SSE 재연결 로직
- **Infrastructure Design**: **SKIP** (로컬 한정)
- **Code Generation**: Backend → Customer Web → Admin Web 순 또는 병렬 (`shared` 먼저 + Backend dev 서버 + Frontend 병렬)
- **Build and Test**: pnpm 루트 스크립트 (`pnpm build`, `pnpm test`, `pnpm dev`) + e2e 시나리오 (QR 스캔 → 메뉴 → 카트 → 주문 → 대시보드 반영)

---

## 8. 산출물 위치

```text
aidlc-docs/inception/
├── application-design/
│   ├── components.md
│   ├── component-methods.md
│   ├── services.md
│   ├── component-dependency.md
│   └── application-design.md      ← 본 문서
└── plans/
    └── application-design-plan.md  ← Plan(답변 포함)
```
