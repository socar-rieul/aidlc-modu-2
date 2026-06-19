# Application Design Plan — 테이블오더 서비스 (v2)

> **Stage**: INCEPTION · Application Design · Step 2~9 산출물 (Planning)
> **Prior context**: [`requirements.md` v2](../requirements/requirements.md) · [`stories.md` v2 (25 스토리)](../user-stories/stories.md) · [`personas.md` v2](../user-stories/personas.md) · [`execution-plan.md`](execution-plan.md)
> **확정 기술 스택**: TypeScript · NestJS · React · SQLite · JWT(30일) · bcrypt · SSE · UUIDv4(QR) · 로컬 한정

본 문서는 AI-DLC inception/application-design.md Step 2(plan 생성) ~ Step 9(ambiguity 해소)의 산출물이다. Step 10(실제 design 4종 + 통합 문서 생성)은 본 plan 승인 후 실행한다.

---

## Section A — 디자인 결정 사항 (Embedded Questions)

각 질문은 사용자 답변을 받기 위한 `[Answer]:` 태그를 포함한다. AskUserQuestion 선택형 UI로 수집한 답을 기입한다.

### Q1 — Backend NestJS 모듈 구조

**맥락**: 12개 데이터 모델 + 6개 API 도메인(Auth · QR/Session · Menu · Cart · Order · SSE · Admin)을 어떤 단위로 모듈을 나눌지.

- **A. 도메인별 모듈** — `AuthModule`, `StoreModule`, `MenuModule`, `CartModule`, `OrderModule`, `SseModule`, `QrModule`, `AdminModule` 등 도메인 단위 NestJS 모듈. 각 모듈 내부에 `controller / service / repository / dto` 폴더.
- **B. 레이어별 단일 모듈** — `src/controllers/`, `src/services/`, `src/repositories/` 한 폴더씩, NestJS 모듈은 하나(`AppModule`)만.
- **C. 하이브리드** — 도메인별 모듈 + 모듈 내부 layer 분리 (A와 동일하지만 cross-domain shared layer는 별도 `common/` 폴더로).
- **D. 모놀리식 단일 src/** — 워크샵 단순화. 모듈 분리 없이 한 폴더에 controller/service 평면 배치.

**근거 후보**: A 권장 — NestJS 정석 패턴, 25 스토리 규모에 충분, 도메인 경계 명확화로 Functional Design per-unit과 매핑 쉬움. (B/D는 작은 PoC엔 빠르지만 도메인 의존 시각화가 어려워짐.)

**[Answer]: A. 도메인별 모듈** — AuthModule, StoreModule, MenuModule, CartModule, OrderModule, SseModule, QrModule, AdminModule. 각 모듈 내부 controller/service/repository/dto 분리.

---

### Q2 — API 통신 스타일

**맥락**: 고객 PWA(U2)·관리자 SPA(U3) ↔ Backend(U1) 통신 + 공유 타입 안전성.

- **A. REST + JSON** — NestJS 기본, `@nestjs/swagger` OpenAPI 자동 생성, 클라이언트는 `fetch` / `axios`. 가장 표준적.
- **B. REST + 수동 공유 DTO** — REST 그대로, 단 `shared/types` 폴더의 TypeScript 인터페이스를 백·프론트가 공유 import.
- **C. tRPC** — TypeScript 함수 호출 형태로 type-safe RPC. NestJS와 함께 쓰려면 적응 필요.
- **D. GraphQL** — `@nestjs/graphql` + Apollo Client. 워크샵 규모엔 오버.

**근거 후보**: **B 권장** — REST + 공유 DTO 폴더. NestJS Swagger UI로 디버깅 편하고, TypeScript 모노레포 path mapping으로 타입 안전성도 챙김. tRPC는 학습 곡선 위험.

**[Answer]: B. REST + 공유 DTO** — `packages/shared/src/dto` 및 `packages/shared/src/sse-events`에 TypeScript 인터페이스/Zod-or-class-validator 데코레이션 정의. NestJS Swagger 자동 생성으로 디버깅 보조.

---

### Q3 — ORM / DB 접근 방식 (SQLite)

**맥락**: 12개 엔티티 + 주문 스냅샷(CR-4) + 매장ID 스코프 격리(CR-1) + 공동 장바구니 동시성(CR-6 last-write-wins, 서버 버전 부여).

- **A. TypeORM** — NestJS 공식 통합, `@nestjs/typeorm`. 데코레이터 기반 엔티티. 마이그레이션 도구 포함.
- **B. Prisma** — `schema.prisma` 단일 진실 소스, 타입 자동 생성, query 빌더 직관적. SQLite 1급 지원. NestJS 통합 가벼움.
- **C. Drizzle ORM** — 매우 가벼움, raw SQL에 가까운 type-safe 빌더. 빠르지만 생태계 작음.
- **D. better-sqlite3 raw** — ORM 없이 직접 쿼리. 워크샵 초단순화.

**근거 후보**: **B Prisma 권장** — 스키마 우선 모델이 12 엔티티 관계 시각화에 유리, 마이그레이션 한 줄(`prisma migrate dev`), 시드(`prisma db seed`) 표준. NestJS와도 잘 어울림.

**[Answer]: A. TypeORM** — NestJS 공식 통합(`@nestjs/typeorm`). 데코레이터 기반 엔티티 정의가 도메인별 모듈 구조(Q1)와 자연 결합. 마이그레이션 도구 내장(`typeorm migration:generate`).

---

### Q4 — Validation / Schema 라이브러리

**맥락**: DTO 입력 검증(메뉴 가격 ≥ 1원, QR 토큰 형식, 주문 페이로드 등) + SSE 이벤트 페이로드 형태 보장.

- **A. class-validator + class-transformer** — NestJS 기본 권장. 데코레이터 기반. Q3-A(TypeORM)와 자연 결합.
- **B. Zod** — 런타임 검증 + 타입 추론 동시. Q3-B(Prisma)와 자연 결합 (Prisma 모델 → Zod 스키마 자동 생성기 있음).
- **C. 둘 다 병행** — class-validator(컨트롤러 DTO) + Zod(SSE 이벤트 / 시드 데이터).

**근거 후보**: **Q3 답변에 종속** — Q3=A면 A, Q3=B면 B. 일관성 우선.

**[Answer]: A. class-validator + class-transformer** (Q3=TypeORM에 자동 매칭). 모든 DTO에 `@IsString()`, `@IsInt({min:1})`, `@IsUUID()` 등 데코레이터 적용. SSE 이벤트 페이로드도 동일 DTO 클래스 재사용.

---

### Q5 — Frontend 상태 관리 (U2 + U3)

**맥락**: 공동 장바구니 SSE 동기화·관리자 그리드 SSE 실시간 갱신·테이블 내역 SSE 추가·QR/세션 인증 상태.

- **A. TanStack Query (React Query)** + 로컬 `useState` — 서버 상태는 React Query 캐시·SSE 이벤트는 `queryClient.setQueryData`로 통합. UI 로컬 상태는 React useState.
- **B. Redux Toolkit** + RTK Query — Redux 중심. 학습 곡선 있음.
- **C. Zustand** — 가벼운 글로벌 store. SSE 이벤트를 store에 직접 dispatch.
- **D. React Context + useReducer** — 외부 라이브러리 없음. 25 스토리 규모엔 빠듯.

**근거 후보**: **A 권장** — SSE 실시간 갱신 + 서버 상태(메뉴·테이블 그리드·주문 내역)가 핵심이라 React Query 모델이 자연스러움. 로컬 UI 상태는 그냥 useState로 충분.

**[Answer]: A. TanStack Query + useState** — `@tanstack/react-query`로 메뉴·장바구니·주문 내역·관리자 그리드 캐싱. EventSource로 SSE 수신 → `queryClient.setQueryData()`로 캐시 직접 갱신. UI 토글·모달 상태는 useState/useReducer.

---

### Q6 — Project 구조 (monorepo 여부)

**맥락**: 3 유닛(U1 NestJS · U2 고객 PWA · U3 관리자 SPA) + 공유 TypeScript 타입(DTO·SSE 이벤트) 패키지.

- **A. npm workspaces 모노레포** — `packages/backend/`, `packages/customer-web/`, `packages/admin-web/`, `packages/shared/`. 한 `npm install`로 전체 설치, path import.
- **B. pnpm workspaces** — A와 동일하지만 pnpm 사용. 의존 격리·디스크 효율 ↑, 학습 비용 약간.
- **C. 단일 디렉토리 + 폴더 분리** — 모노레포 없이 `backend/`, `customer-web/`, `admin-web/`, `shared/` 평면 폴더. 각 폴더에서 `npm install`. shared는 path alias로 import.
- **D. 완전 분리 3 레포** — 워크샵 규모엔 과함.

**근거 후보**: **A 권장** — 워크샵 PoC + 공유 타입 → npm workspaces가 가장 마찰 적음. (B pnpm은 사용 익숙도 모를 때 부담.)

**[Answer]: C. pnpm workspaces** — `pnpm-workspace.yaml`에 `packages/*` 등록 + `packages/{backend,customer-web,admin-web,shared}` 구조. pnpm hoisting 격리로 의존 충돌 방지 + 디스크 효율 ↑. 루트 `pnpm install` 한 번으로 전 패키지 설치.

---

## Section B — Step 10 산출물 계획 (체크리스트)

위 6문항 답변 확정 후 다음을 작성한다.

- [ ] B1. `inception/application-design/components.md` — 컴포넌트 카탈로그
  - U1 Backend: NestJS 모듈 × N (Q1 답변 반영) + 각 모듈 책임·인터페이스 요약
  - U2 Customer Web: React 컴포넌트 트리(페이지 / 컨테이너 / 프레젠테이션 / 훅) + PWA shell
  - U3 Admin Web: React 컴포넌트 트리(로그인 / 대시보드 그리드 / 메뉴 관리 / 테이블 관리)
- [ ] B2. `inception/application-design/component-methods.md` — 메서드 시그니처
  - 각 NestJS 서비스의 public method 시그니처(입력/출력 타입만, 비즈니스 룰은 Functional Design에서)
  - SSE 이벤트 카탈로그(이벤트명·페이로드 스키마·발화 시점)
  - REST endpoint 카탈로그(메서드·경로·요청/응답 DTO)
- [ ] B3. `inception/application-design/services.md` — 서비스 레이어
  - Application service(orchestration) vs Domain service 구분
  - Cross-cutting: 인증 가드(JWT for admin / QR token for customer), 매장ID·세션ID 스코프 가드(CR-1·CR-2 강제), 트랜잭션 경계, SSE 채널 라우팅 정책
  - 시드 데이터 적재 서비스(매장·메뉴·광고)
- [ ] B4. `inception/application-design/component-dependency.md` — 의존 관계
  - 컴포넌트 의존 매트릭스(누가 누구를 호출/구독)
  - 통신 패턴: REST(요청-응답) + SSE(서버→클라이언트 푸시) + 클라이언트 → REST POST → 서버 → SSE 브로드캐스트
  - 데이터 흐름 시퀀스 다이어그램 핵심 3개:
    - 시퀀스 1: 고객 QR 스캔 → 메뉴 진입 (US-C1.1)
    - 시퀀스 2: 공동 장바구니 변경 → SSE 브로드캐스트 (US-C3.1)
    - 시퀀스 3: 주문 확정 → 장바구니 비움 + 주문 내역 SSE 푸시 + 관리자 대시보드 갱신 (US-C4.1 + US-A2.1)
- [ ] B5. `inception/application-design/application-design.md` — 위 4개 통합 단일 문서
- [ ] B6. `aidlc-state.md` Application Design [x] 갱신 + Current Stage 갱신
- [ ] B7. audit.md에 Step 10 완료 + 산출물 목록 로그
- [ ] B8. Step 12 Completion Message 사용자 제시 → 승인 대기

---

## Section C — Ambiguity Resolution (Step 8~9)

답변 수집 직후 본 섹션을 채워 vague / contradictory / missing 응답 점검. 발견 시 follow-up `[Answer]:` 추가 후 사용자에게 재질의한다.

- **Vague**: 없음 — 6문항 모두 단일 선택지 명확.
- **Contradictory**: 없음 — Q3(TypeORM) ↔ Q4(class-validator) 자동 매칭, Q1(도메인별 모듈) ↔ Q2(REST + 공유 DTO) 자연 결합, Q5(TanStack Query) ↔ Q6(pnpm workspaces) 영향 없음.
- **Missing**: SSE 채널 구조(매장 단위 vs 테이블 세션 단위 vs 단일)는 본 plan에서 결정 안 됨 — 단, **Application Design Step 10의 component-methods.md / component-dependency.md 작성 시 기본안 제시 후 사용자 확인** 가능 영역(룰에서 design artifact 안에서 결정). 또한 PWA manifest·테스트 라이브러리 선택은 NFR Design / Code Generation 단계 결정사항으로 미룬다.
- **Follow-up [Answer]:** 불필요 — Step 10으로 진행 가능.
