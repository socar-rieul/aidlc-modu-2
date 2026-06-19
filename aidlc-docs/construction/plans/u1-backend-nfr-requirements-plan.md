# U1 Backend — NFR Requirements Plan (v2.2)

> **Stage**: CONSTRUCTION · U1 Backend · NFR Requirements Step 2~5 산출물 (Planning)
> **Prior context**: [`requirements.md` v2 NFR-1~NFR-12](../../inception/requirements/requirements.md) · [`application-design.md`](../../inception/application-design/application-design.md) · [`business-rules.md`](../u1-backend/functional-design/business-rules.md) · [`domain-entities.md`](../u1-backend/functional-design/domain-entities.md)

본 plan은 AI-DLC construction/nfr-requirements.md Step 2 ~ Step 5 산출물이다. Step 6에서 2종 산출물(nfr-requirements.md + tech-stack-decisions.md)을 생성한다.

---

## Section A — 기존 결정 요약 (질문하지 않음)

requirements.md v2 + Application Design + Functional Design에서 이미 확정된 사항. 본 NFR Requirements 단계는 이를 U1 backend 관점에서 정리 + 보조 결정만 추가.

| 카테고리 | 결정 | 출처 |
|----------|------|------|
| Scalability | 워크샵 PoC · 로컬 단일 머신 · 단일 매장 시드 · 동시 사용자 수 명시 안 됨 | NFR-8 |
| Performance | SSE 푸시 ≤ 2초 | NFR-1 |
| Performance | API 응답 시간 목표 명시 없음 → **권장 기본 ≤ 200ms 평균 / ≤ 500ms p95** (보조 결정 필요 없으면 기본값 채택) | (신규) |
| Availability | 로컬 PoC → N/A | NFR-8 |
| Security | Security Baseline Extension OFF | Q7 |
| Security | bcrypt rounds = 10 (CR-5 일반 권장) + JWT HS256 + 30일 exp | CR-5, NFR-2, NFR-3 |
| Security | UUIDv4 토큰 (qrToken, sessionParticipant.token) | CR-5 |
| Security | 매장ID·세션ID 스코프 격리 | CR-1, NFR-7 |
| Reliability | Resiliency Baseline Extension OFF | Q9 |
| Reliability | 표준 예외 필터·인터셉터 (services.md §3.4) | App Design |
| Maintainability | NestJS DI + EventEmitter2 mock 용이 | NFR-10 |
| Maintainability | Property-Based Testing OFF | Q8 |
| Usability | Backend라 N/A | — |
| Tech Stack | NestJS · TypeORM · class-validator · @nestjs/jwt · bcrypt · @nestjs/event-emitter · uuid · qrcode · @nestjs/swagger | App Design Q1~Q4 |
| Tech Stack | SQLite (`packages/backend/data/app.sqlite`) | Req Q4 |
| Tech Stack | Java 금지 | NFR-9 |

---

## Section B — 보조 결정 (Embedded Questions)

추가로 결정할 NFR/Tech Stack 사항만 묻는다. 3개로 압축.

### Q1 — 로그 라이브러리 선택

**맥락**: 워크샵 디버깅 + audit 추적용. NestJS는 built-in `Logger` 클래스 제공. 외부 라이브러리 옵션도 흔함.

옵션:
- **A. NestJS built-in Logger** (권장) — 추가 의존 없음, 컬러풀 console 출력, `Logger.log/warn/error/debug` 메서드, NestJS 부트스트랩이 자동 사용. 워크샵 PoC에 충분.
- **B. pino** — 고성능 JSON 로깅, structured log, 운영 환경 표준이지만 로컬 PoC엔 오버.
- **C. winston** — 다중 transport, file rotation 등 풍부하지만 의존 무거움.

**근거 후보**: A — built-in으로 충분, 의존성 최소화.

**[Answer]: A. NestJS built-in Logger** — 의존성 추가 없음. main.ts 부트스트랩에서 글로벌 Logger 활성. 도메인 service에 `private readonly logger = new Logger(ClassName.name)` 패턴. 인터셉터(`LoggingInterceptor`)가 컨트롤러 entry/exit + duration ms 자동 로그.

---

### Q2 — 테스트 전략 + 커버리지 목표

**맥락**: PBT는 OFF (Q8). 기본 단위 + e2e만 사용. 워크샵 PoC에서 어디까지 커버할지.

옵션:
- **A. Jest 단위 + Supertest e2e** (권장) — NestJS 표준. 도메인 service는 단위 테스트(mock repo), 컨트롤러는 e2e (HTTP + in-memory SQLite). 커버리지 **목표 명시 없음** — 핵심 use-case AC 시나리오 위주.
- **B. 단위만** — 빠르지만 SSE·트랜잭션 통합 검증 어려움.
- **C. 단위 + e2e + 커버리지 80% 강제** — 워크샵 시간 부담.

**근거 후보**: A — 워크샵 PoC + Use-Case 시나리오 위주 e2e가 가장 가성비.

**[Answer]: A. Jest 단위 + Supertest e2e** — `*.spec.ts` 도메인 service mock 단위 + `test/*.e2e-spec.ts` HTTP + in-memory(또는 별도 파일) SQLite. 커버리지 강제 없음, UC-1~UC-8 핵심 시나리오 + 가드 격리 + CR-1·CR-4·CR-6 회귀 e2e만 보장.

---

### Q3 — SQLite 옵션 (파일 위치 + 동시성)

**맥락**: 공동 장바구니 last-write-wins(CR-6) + Cart row `FOR UPDATE` lock + SSE 다중 구독자. SQLite는 기본 single-writer지만 WAL mode가 동시성 향상.

옵션:
- **A. 파일 + WAL mode** (권장) — `data/app.sqlite` + `PRAGMA journal_mode = WAL` + `synchronous = NORMAL`. 동시 read·write 향상, 단일 writer 제한은 유지하지만 short transaction에 적합.
- **B. 파일 + 기본 journal_mode** — DELETE journal, write 시 read 차단. 워크샵 PoC엔 충분.
- **C. :memory: dev only** — 프로세스 종료 시 데이터 휘발. seed 매번 재실행 부담.

**근거 후보**: A — WAL은 SQLite 표준 권장 옵션, 추가 코드 한 줄로 가능. 카트·주문 동시성에 유리.

**[Answer]: A. 파일 + WAL mode** — `packages/backend/data/app.sqlite` (gitignore). DataSource 초기화 시 `PRAGMA journal_mode = WAL`, `PRAGMA synchronous = NORMAL`, `PRAGMA foreign_keys = ON` 실행. CR-6 last-write-wins는 application 레벨 row lock(`FOR UPDATE`)으로 보완.

---

## Section C — Step 6 산출물 계획 (체크리스트)

위 3 답변 확정 후:

- [ ] C1. `construction/u1-backend/nfr-requirements/nfr-requirements.md`
  - Scalability / Performance / Availability / Security / Reliability / Maintainability 6 카테고리별 U1 적용 사항
  - requirements.md v2 NFR-1~NFR-12를 U1 관점에서 재해석 + 보강
  - SLO/SLI 정의 (응답 시간·SSE latency·로그인 차단 정책 등)
- [ ] C2. `construction/u1-backend/nfr-requirements/tech-stack-decisions.md`
  - Application Design Q1~Q4 결정 + Functional Design 결정 통합
  - NFR Q1~Q3 답변 반영 (로그·테스트·SQLite)
  - 의존 패키지 목록(package.json 예상안) + 버전 정책
- [ ] C3. `aidlc-state.md` U1 NFR Requirements [x] + Current Stage 갱신
- [ ] C4. `audit.md` Step 6 완료 로그
- [ ] C5. Step 7 Completion Message + Approval Gate

---

## Section D — Ambiguity Resolution (Step 5)

답변 수집 직후 점검.

- **Vague**: 없음 — 3문항 모두 명확한 권장 선택.
- **Contradictory**: 없음 — built-in Logger ↔ Supertest e2e ↔ SQLite WAL 자연 결합.
- **Missing**: 응답 시간 SLO는 본 plan Section A의 기본값(평균 ≤ 200ms · p95 ≤ 500ms)을 적용. 추가 결정 불필요.
- **Follow-up [Answer]:** 불필요 — Step 6 산출물 생성으로 진행.
