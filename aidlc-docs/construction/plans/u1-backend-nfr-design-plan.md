# U1 Backend — NFR Design Plan (v2.2)

> **Stage**: CONSTRUCTION · U1 Backend · NFR Design Step 2~5 산출물 (Planning)
> **Prior context**: [`nfr-requirements.md`](../u1-backend/nfr-requirements/nfr-requirements.md) · [`tech-stack-decisions.md`](../u1-backend/nfr-requirements/tech-stack-decisions.md) · [`services.md`](../../inception/application-design/services.md)

본 plan은 AI-DLC construction/nfr-design.md Step 2~5 산출물이다. Step 6에서 2종(nfr-design-patterns.md + logical-components.md)을 생성한다.

---

## Section A — 기존 결정 (질문하지 않음)

워크샵 PoC + 로컬 한정 + Resiliency Extension OFF로 인해 다음 카테고리는 기본 결정으로 채택:

| 카테고리 | 기본 결정 | 사유 |
|----------|-----------|------|
| Resilience | **재시도/Circuit Breaker 없음** | Resiliency Extension OFF (Q9), 외부 API 호출 없음 |
| Scalability | **스케일 아웃 없음** | NFR-8 로컬 단일 머신 |
| Performance Cache | **Cache 없음** | 메뉴/광고는 정적이고 SQLite read 충분, 추가 캐시 layer 불필요 |
| Security 패턴 | **JwtAuthGuard + ScopeGuard 체인** | App Design services.md §3.1 |
| Security 패턴 | **bcrypt rounds=10 + UUIDv4 + JWT HS256** | CR-5, NFR-3 |
| SSE 채널 | **in-memory Map<channelKey, Subject>** | services.md §3.3 |
| 트랜잭션 | **TypeORM DataSource.transaction** | tech-stack-decisions.md |
| 검증 | **Global ValidationPipe + class-validator** | App Design Q4 |
| CORS | **개발 origin whitelist** | nfr-requirements.md §5 |

---

## Section B — 패턴 보강 결정 (Embedded Questions)

### Q1 — 트랜잭션 helper 패턴

**맥락**: UC-2/3/4/6/7/8 모두 트랜잭션 안에서 처리. NestJS에서 트랜잭션 적용 방식.

옵션:
- **A. `DataSource.transaction(async manager => …)` 직접 호출** (권장) — service 메서드 안에서 명시적 호출. NestJS·TypeORM 표준 패턴. cross-domain 호출 시 manager 전달.
- **B. Custom `@Transactional()` 데코레이터** — typeorm-transactional 라이브러리. AOP 방식, 코드 깔끔하지만 추가 의존 + cls-hooked 도입 부담.
- **C. Repository 단위 미니 트랜잭션** — 각 메서드 안에서 자체 트랜잭션. 도메인 간 협력 시 트랜잭션 경계 깨질 가능성 ↑.

**근거 후보**: **A 권장** — 명시적·표준·workshop PoC 단순. cross-domain orchestration(OrderService.createOrder가 Table·Cart·Menu 협력) 시 manager 전달이 자연.

**[Answer]: A. DataSource.transaction 직접** — `await this.dataSource.transaction(async manager => { … })`. cross-domain은 helper signature에 `manager?: EntityManager` 옵션 인자 추가해 nested 호출 시 전달. 별도 라이브러리 의존 없음.

---

### Q2 — SSE 재연결 후 reconcile 책임

**맥락**: EventSource는 기본 자동 재연결(3초). 단절 중 발생한 이벤트는 누구 책임으로 동기화?

옵션:
- **A. 클라이언트 책임** (권장) — 재연결 직후 `useSseChannel` 훅이 GET `/sessions/:sid/cart` + `/orders` (또는 `/admin/dashboard`)를 호출해 캐시 통째로 갱신. 서버 stateless 유지, 구현 단순.
- **B. 서버 last-N 이벤트 캐시** — `SseModule`이 채널당 최근 N(예: 50) 이벤트 in-memory 버퍼 보유. EventSource `Last-Event-ID` 헤더로 누락 이벤트 재전송. 정확성 ↑, 메모리·복잡도 ↑.
- **C. 서버가 클라이언트에 "재호출하라" 신호 보냄** — 재연결 직후 `sync.required` 이벤트 1회 발화, 클라이언트가 reconcile fetch. A와 사실상 동일하지만 패턴 명시화.

**근거 후보**: **A 권장** — 워크샵 PoC 단순화. NFR-1 ≤2초 latency는 정상 흐름 보장, 단절 후 누락은 클라이언트 fetch로 충분.

**[Answer]: A. 클라이언트 책임** — 서버는 stateless. `useSseChannel` 훅의 `onopen`/`onreconnect`에서 react-query `invalidateQueries(['cart'])` + `invalidateQueries(['orders'])`(또는 `['dashboard']`) 호출로 reconcile. 서버 측 이벤트 캐시 없음.

---

## Section C — Step 6 산출물 계획

- [ ] C1. `nfr-design/nfr-design-patterns.md`
  - 가드 체인 패턴 (5종)
  - 트랜잭션 패턴 (Q1 답변)
  - SSE 채널 패턴 (Subject + keep-alive + reconnect — Q2 답변)
  - EventEmitter2 디커플링 패턴
  - 예외/검증/로깅 인터셉터 패턴
  - bcrypt + UUIDv4 + JWT 패턴
- [ ] C2. `nfr-design/logical-components.md`
  - in-memory SSE 채널 레지스트리
  - 시드 Bootstrap 컴포넌트
  - CORS · Swagger · LoggingInterceptor · HttpExceptionFilter · ValidationPipe · RateLimitGuard
  - SQLite DataSource (WAL · synchronous · foreign_keys)
- [ ] C3. `aidlc-state.md` U1 NFR Design [x] + Current Stage 갱신
- [ ] C4. `audit.md` Step 6 완료 로그
- [ ] C5. Step 7 Completion + Approval Gate

---

## Section D — Ambiguity (Step 5)

답변 수집 직후 점검.

- **Vague**: 없음.
- **Contradictory**: 없음. A+A 자연 결합.
- **Missing**: 없음. 나머지 패턴은 기존 결정으로 산출물에 명시.
- **Follow-up [Answer]:** 불필요.
