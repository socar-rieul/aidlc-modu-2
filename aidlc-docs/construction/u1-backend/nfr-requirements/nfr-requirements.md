# U1 Backend — NFR Requirements (v2.2)

> **Stage**: CONSTRUCTION · U1 Backend · NFR Requirements Step 6 산출물 (1/2)
> **Inputs**: [`requirements.md` v2 NFR-1~NFR-12](../../../inception/requirements/requirements.md) · [`u1-backend-nfr-requirements-plan.md`](../../plans/u1-backend-nfr-requirements-plan.md) · [`business-rules.md`](../functional-design/business-rules.md)

본 문서는 U1 Backend의 **6 카테고리(Scalability / Performance / Availability / Security / Reliability / Maintainability) NFR**을 정리한다. tech stack 선택은 [`tech-stack-decisions.md`](tech-stack-decisions.md). NFR 구현 패턴(코드 패턴)은 다음 단계 [`nfr-design.md`].

---

## 1. NFR 매핑 — requirements.md v2 ↔ U1 Backend

| NFR ID | 카테고리 | 요구사항 요약 | U1 적용 메커니즘 |
|--------|----------|---------------|------------------|
| **NFR-1** | Performance | 신규 주문/장바구니 변경 → 같은 세션 참가자 ≤ 2초 | SseService.emit이 트랜잭션 commit 직후 발화 + EventEmitter2 동기 dispatch. 로컬 환경에선 round-trip ≤ 100ms 기대. |
| **NFR-2** | Security/Session | 관리자 JWT 30일 + 만료 시 자동 로그아웃 | `@nestjs/jwt`의 sign payload exp=`now + 30d`. `JwtAuthGuard`가 만료 검증 → 401. |
| **NFR-3** | Security | bcrypt 해싱 + 시도 제한 + UUIDv4 토큰 | bcrypt rounds=10 + StoreUser.failedAttempts/lockUntil + crypto.randomUUID(). |
| **NFR-4** | Usability | 모바일 a11y · rem · 큰 글자 모드 | (U2 책임) — U1은 시스템 폰트 따라가기 위해 별도 처리 없음. |
| **NFR-5** | Persistence | 세션 토큰만 본인 폰 localStorage, 카트는 서버 권한 | U1은 Cart row가 SSOT. `SessionParticipant.token`만 client 보유. |
| **NFR-6** | Realtime | SSE 채널 + keep-alive | SseModule 두 채널(`/sse/sessions/:sid`, `/sse/stores/:storeId`) + 15초 keep-alive 라인. |
| **NFR-7** | Data Isolation | 매장ID + 세션ID 스코프 강제 | `StoreScopeGuard` + `SessionScopeGuard` (CR-1·CR-3). |
| **NFR-8** | Local-only | 클라우드 의존 없음 · `npm` 한 줄 기동 | `pnpm install` → seed → `dev`. 외부 API 호출 없음. |
| **NFR-9** | Tech Constraint | Java 금지 | TypeScript 전체 (Q3 답변). |
| **NFR-10** | Testability | NestJS DI mock 용이 | Jest 단위 + Supertest e2e (본 단계 Q2). |
| **NFR-11** | Responsive/BYOD | iOS Safari / Android Chrome 최신 · 320~480px | (U2 책임). |
| **NFR-12** | Concurrency | 공동 카트 동시성 last-write-wins + version monotonic | Cart row `FOR UPDATE` + Cart.version 단조 증가 + SSE reconcile. SQLite WAL mode 보강. |

---

## 2. Scalability Requirements

| 항목 | 요구 |
|------|------|
| 동시 매장 수 | 워크샵 시드 = 1 매장. 코드 구조는 다중 매장 지원(CR-1)이지만 부하 검증 X. |
| 매장당 동시 활성 테이블 | 시드 = 5 테이블. 동시 활성 세션 5개 가정. |
| 테이블당 동시 참가자 (BYOD) | UI/룰 무제한, 워크샵 검증 = 2~3명 시나리오. |
| 동시 SSE 구독자 | 매장당 1 admin + 테이블당 N 고객 ≈ 10~20. NestJS event-emitter in-memory로 충분. |
| 메뉴 수 | 시드 12개, 최대 100개 가정. SQLite 인덱스로 충분. |
| 데이터 보존 | OrderHistory 무제한 누적, MVP 압축 X. |

**스케일 트리거**: 본 PoC는 스케일 아웃 트리거 없음. 운영 환경 전환 시 Postgres/Redis 마이그레이션이 별도 단계.

---

## 3. Performance Requirements

| 항목 | 목표 | 측정 방법 |
|------|------|-----------|
| REST API 평균 응답 | ≤ 200ms | LoggingInterceptor의 duration 로그 |
| REST API p95 | ≤ 500ms | (수동 관측) |
| SSE 푸시 latency (트랜잭션 commit → 클라이언트 수신) | ≤ 2초 (NFR-1) | e2e 시나리오에서 EventSource 수신 timing |
| 시드 데이터 적재 | ≤ 5초 | `pnpm --filter backend seed` 1회 cold start |
| 부트스트랩 시작 (NestJS) | ≤ 3초 | 로그 timestamp |

**부하 테스트**: 워크샵 PoC라 정식 부하 테스트 미수행. 동시 N 참가자 카트 추가 시나리오만 수동 검증.

---

## 4. Availability Requirements

- 워크샵 단일 머신 PoC → **재시작 가능, 다운타임 허용**. SLA·SLO·OnCall 정책 없음.
- **DB 복구**: SQLite 파일 단순 복사로 백업 가능. 시드 idempotent라 재실행으로 초기화도 OK.
- **장애 복구 RPO/RTO**: N/A.

---

## 5. Security Requirements

| 영역 | 요구 |
|------|------|
| 인증 | 관리자 JWT 30일 (NFR-2). HS256 + 256-bit secret (env: `JWT_SECRET`). |
| 인가 | `JwtAuthGuard`, `StoreScopeGuard`, `QrTokenGuard`, `SessionScopeGuard` 4단 체인. |
| 비밀번호 | bcrypt rounds=10 (CR-5). 평문 어디에도 저장·로그 안 함. |
| 토큰 | qrToken / sessionParticipant.token = UUIDv4 (crypto.randomUUID). 충분한 엔트로피. |
| 시도 제한 | StoreUser failedAttempts 5회 → lockUntil 5분 (AU-1). |
| CORS | 로컬 dev 환경 origin whitelist — `http://localhost:5173` (Customer Web), `http://localhost:5174` (Admin Web). production 분리 정책 X (NFR-8). |
| Helmet | 워크샵 PoC라 OFF (Q7 Security Extension OFF). |
| Rate Limit | 로그인 endpoint만 RateLimitGuard 적용 (AU-1). 다른 endpoint 미적용 (NFR-8). |
| 외부 데이터 | 광고 자산은 시드 데이터(local URL or 정적 image). 외부 API 호출 없음 (CR-7). |
| 로그 PII | 비밀번호 평문 마스킹. JWT/세션 토큰 last 4자만 로그. |
| Secrets | env 파일 (`.env`) — `JWT_SECRET`, `DB_PATH`. `.gitignore` 등록. |

**Threat 모델** (워크샵 수준):
- QR 토큰 노출 → 관리자 수동 재발급 (UC-6).
- 비밀번호 brute force → AU-1 lock + 메시지 통일(`LOGIN_FAILED`로 user enumeration 차단).
- 세션 토큰 탈취 → UUIDv4 충분 + 만료/무효화 API.

---

## 6. Reliability Requirements

| 영역 | 요구 |
|------|------|
| 예외 처리 | `HttpExceptionFilter` 글로벌 — 모든 throw를 표준 응답 `{ statusCode, message, errorCode, details? }`로 직렬화. |
| 미처리 예외 | 500 + 로그. process.on('unhandledRejection') 핸들러. |
| 트랜잭션 | UC-2/3/4/6/7/8 모두 transaction 안에서 처리. rollback 시 SSE 발화 안 함. |
| 재시도 정책 | Backend 자체 재시도 없음 (Resiliency Extension OFF). 클라이언트(EventSource) 자동 재연결만. |
| 데이터 무결성 | TypeORM 제약 + DB constraint (CHECK·UNIQUE·FK). 트랜잭션 commit 단위. |
| 로그 보존 | 콘솔만, 파일 미적재 (Q1=NestJS built-in). |

---

## 7. Maintainability Requirements

| 영역 | 요구 |
|------|------|
| 모듈성 | 도메인별 모듈(9 + Common) — App Design Q1. |
| 코드 스타일 | ESLint + Prettier (NestJS CLI 기본). |
| 타입 안전 | TypeScript strict mode. shared 패키지로 DTO 타입 통일. |
| 테스트 | Jest 단위 + Supertest e2e (Q2). 핵심 use-case UC-1~UC-8 + CR 검증. |
| 문서 | Swagger UI (`/api/docs`) 자동 생성 — REST 27 endpoint + DTO schema. |
| EventEmitter2 디커플링 | SSE 발화는 도메인 → emit → SseService listener (services.md §3.5). |
| 코드 ↔ 문서 일관성 | shared 패키지 DTO ↔ component-methods.md SSOT. |
| Property-Based Testing | OFF (Q8). |

---

## 8. Usability Requirements

- U1은 backend-only → N/A.
- 단, Swagger UI(`/api/docs`)는 개발자 usability 측면에서 제공.

---

## 9. SLO/SLI 요약

| SLI | SLO | 측정 |
|-----|-----|------|
| REST API 평균 응답 시간 | ≤ 200ms | LoggingInterceptor duration |
| REST API p95 응답 시간 | ≤ 500ms | (수동) |
| SSE 푸시 latency | ≤ 2초 (NFR-1) | e2e 시나리오 timing |
| 로그인 brute force 차단 | 5회 실패 후 5분 lock | AU-1 |
| 트랜잭션 commit 후 SSE 손실률 | 0% (commit ↔ emit 동기) | e2e 검증 |
| 데이터 격리 (CR-1) | 100% | e2e 가드 회귀 |

---

## 10. NFR ↔ Use-case Traceability

| NFR | 영향 use-case |
|-----|---------------|
| NFR-1, NFR-6, NFR-12 | UC-2, UC-3, UC-4, UC-5, UC-7 (SSE 발화·동시성) |
| NFR-2 | (모든 admin endpoint — 인증 가드) |
| NFR-3 | UC-1, AuthService |
| NFR-5 | UC-1 (서버 권한 Cart 생성) |
| NFR-7 | (모든 protected endpoint) |
| NFR-8 | seed module · CR-7 광고 시드 |
| NFR-10 | Jest 단위 + e2e — 모든 UC 회귀 |

---

## 다음 단계

다음 NFR Design 단계에서 본 NFR의 **구현 패턴**(SSE keep-alive 코드 패턴 · class-validator 글로벌 ValidationPipe · CORS 미들웨어 설정 · TypeORM transaction helper · LoggingInterceptor 등)을 정의.
