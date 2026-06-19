# Units Generation Plan — 테이블오더 서비스 (v2.2)

> **Stage**: INCEPTION · Units Generation · Part 1 (Planning) Step 1~11 산출물
> **Prior context**: [`requirements.md` v2](../requirements/requirements.md) · [`stories.md` v2.2 (26 스토리)](../user-stories/stories.md) · [`personas.md` v2](../user-stories/personas.md) · [`execution-plan.md`](execution-plan.md) · [`application-design.md`](../application-design/application-design.md) · [`application-design-plan.md`](application-design-plan.md)
> **확정 스택**: TypeScript · NestJS(도메인별 모듈) · TypeORM + SQLite · class-validator · React + TanStack Query · pnpm workspaces · JWT(30일)·bcrypt · SSE · UUIDv4(QR)

본 plan은 AI-DLC inception/units-generation.md Part 1 (Planning) 산출물이다. Part 2 (Generation)에서 `unit-of-work.md`, `unit-of-work-dependency.md`, `unit-of-work-story-map.md` 3종을 생성한다.

---

## Section A — 결정 사항 (Embedded Questions)

`execution-plan.md §4`에서 권장된 3 유닛 분해(U1 Backend / U2 Customer PWA / U3 Admin SPA) + Application Design 확정 결과를 바탕으로, Units Generation 단계에서 추가로 결정해야 할 사항만 묻는다.

### Q1 — 유닛 분해 단위

**맥락**: 워크샵 PoC + pnpm workspaces 4 패키지(`backend`, `customer-web`, `admin-web`, `shared`). 어디까지가 "개발 유닛"인가?

- **A. 3 유닛** — U1 Backend, U2 Customer Web, U3 Admin Web. `shared` 패키지는 모두에 종속되는 **계약(contract) 패키지**로 별도 유닛으로 다루지 않음(각 유닛 산출 시 함께 정의). **권장 — execution-plan §4 안과 동일.**
- **B. 4 유닛** — A + Shared Contract 유닛 별도. `shared`를 first-class 유닛으로 분리해 가장 먼저 만들고 나머지 3개가 그것을 import.
- **C. 2 유닛** — 백엔드 + (Customer + Admin 통합 프론트). 통합 프론트는 모노레포 안에서 의도적으로 분리해도, 단일 React 앱 구조로 갈 수도 있음.
- **D. N 유닛 (도메인 마이크로유닛)** — Backend를 도메인별(Auth / Menu / Cart / Order ...)로 더 잘게 쪼개고 frontend도 화면 단위 분해. 워크샵 규모엔 과함.

**근거 후보**: **A 권장** — 워크샵 PoC + 사용자가 execution-plan §4에서 미리 보았던 3 유닛 안 그대로. shared는 type-only이라 별도 유닛으로 다룰 만큼 개발 활동량이 없음(Functional Design·NFR Design·Code Generation 사이클 적용 대상이 아님).

**[Answer]: A. 3 유닛** — U1 Backend / U2 Customer Web / U3 Admin Web. `packages/shared`는 4 유닛 중 어느 하나에도 1:1로 귀속되지 않는 횡단 계약 패키지로 처리, 각 유닛 정의에 "공유 의존 패키지"로 명시.

---

### Q2 — Code Generation 진행 순서

**맥락**: Per-unit Construction Phase는 유닛별로 Functional Design → NFR Req → NFR Design → Code Generation 사이클을 돈다. 3 유닛을 어떤 순서로 돌릴지.

- **A. 순차 (U1 → U2 → U3)** — U1을 완전히 끝낸 뒤 U2, U2 끝낸 뒤 U3. 가장 단순하지만 시간 가장 김. **권장 — 워크샵 단일 세션 흐름.**
- **B. U1 먼저 + U2/U3 병렬** — U1(Backend + shared 계약)을 완료해 dev 서버 + Swagger UI 가용 → U2·U3을 분리 에이전트(또는 라운드)로 병렬 진행. 시간 절약, 복잡도 ↑.
- **C. shared + Backend skeleton 우선** → U1 본체 + U2/U3 병렬 — contract만 먼저 만들고 frontend가 mock으로 진행, 백엔드가 채워질 때 통합.
- **D. 전체 동시 (분리 에이전트 × 3)** — Code Generation만 병렬, 그 전 design 단계는 순차. 통합 리스크 ↑.

**근거 후보**: **A 권장** — 워크샵 PoC 단일 세션에서 순차가 가장 안정적. 시간 부족 시 사용자 요청으로 후반 유닛 압축 가능. (B/C는 분리 에이전트 운영을 사용자가 명시적으로 원할 때.)

**[Answer]: A. 순차 U1 → U2 → U3** — Construction Phase는 유닛별 Functional Design → NFR Req → NFR Design → Code Generation 풀 사이클을 한 유닛씩 마무리. U1 완료 시점에 dev 서버·Swagger UI 가용 → U2 / U3 진행.

---

### Q3 — 유닛 간 통신 계약(contract) 위치

**맥락**: REST DTO + SSE 이벤트 타입을 어느 패키지·문서에 두고 어떻게 동기화할지.

- **A. `packages/shared/src/` + Application Design 문서가 SSOT** — `shared`에 코드(class-validator 데코레이션된 클래스) 두고 [`component-methods.md`](../application-design/component-methods.md)가 문서 SSOT. Functional Design은 method 별 비즈니스 룰만 추가. **권장.**
- **B. OpenAPI 스펙 파일 별도** — Backend가 Swagger 자동 생성 → `aidlc-docs/inception/application-design/openapi.yaml`로 export → frontend가 codegen으로 타입 자동 생성. 일관성 ↑, 워크샵엔 오버.
- **C. Functional Design 문서가 SSOT** — 각 유닛의 functional-design/에 자기 노출 contract을 정의, shared는 import만. 분산 ↑, 정합성 관리 ↓.

**근거 후보**: **A 권장** — Application Design 단계에서 이미 [`component-methods.md`](../application-design/component-methods.md)에 REST 27개·SSE 11개 카탈로그 확정. shared 패키지가 곧 코드 단일 진실 소스. Functional Design은 method 안의 비즈니스 룰만 추가.

**[Answer]: A. shared 패키지 + Application Design SSOT** — 코드 단일 진실 소스 = `packages/shared/src/{dto,sse-events,enums}` + class-validator 데코레이션. 문서 SSOT = [`component-methods.md`](../application-design/component-methods.md). Functional Design은 method body 비즈니스 룰만 추가, contract 자체는 수정 X.

---

## Section B — Part 2 (Generation) 산출물 계획

위 3문항 답변 확정 후 Part 2에서 다음을 생성한다 (각 항목 [x] 마킹).

- [ ] B1. `aidlc-docs/inception/application-design/unit-of-work.md`
  - 유닛 정의·책임·기술 스택·소속 패키지·소속 모듈·소속 컴포넌트 트리
  - 각 유닛별 코드 조직 전략 (Greenfield greenfield-only) — pnpm workspaces 루트 + `packages/{backend,customer-web,admin-web,shared}` 구조 + 각 유닛 내부 폴더 패턴
  - Code Generation 순서 (Q2 답변)
  - 통신 계약 위치 (Q3 답변)
- [ ] B2. `aidlc-docs/inception/application-design/unit-of-work-dependency.md`
  - 유닛 × 유닛 의존 매트릭스
  - 유닛 ↔ shared 패키지 의존
  - 통신 패턴 (REST + SSE) — 유닛 단위 재표현 ([`component-dependency.md`](../application-design/component-dependency.md)의 패키지 그래프와 일관)
  - 빌드 순서 / 시드 데이터 의존
- [ ] B3. `aidlc-docs/inception/application-design/unit-of-work-story-map.md`
  - 26 스토리 모두 유닛에 매핑
  - 단일 유닛 vs 다중 유닛 협력(Backend + Customer + Admin)
  - traceability — 스토리 ↔ 유닛 ↔ NestJS 모듈(또는 React 컴포넌트) ↔ REST/SSE endpoint
- [ ] B4. `aidlc-docs/aidlc-state.md` Units Generation [x] + Current Stage 갱신
- [ ] B5. `aidlc-docs/audit.md` Part 2 완료 + 산출물 목록 로그
- [ ] B6. Step 16 Completion Message 사용자 제시 → 승인 대기

---

## Section C — Ambiguity Resolution (Step 7~8)

답변 수집 직후 본 섹션을 채워 vague/contradictory/missing 응답 점검. 발견 시 follow-up `[Answer]:` 추가 후 사용자에게 재질의한다.

- **Vague**: 없음 — 3문항 모두 단일 권장 선택지 명확.
- **Contradictory**: 없음 — Q1(3 유닛) ↔ Q2(순차) ↔ Q3(shared 패키지 SSOT) 자연 결합. Application Design 5종 산출물과 일관.
- **Missing**: 없음. 유닛 간 빌드 순서·시드 데이터 의존은 Part 2 `unit-of-work-dependency.md`에서 결정.
- **Follow-up [Answer]:** 불필요 — Part 2 (Generation)로 진행.
