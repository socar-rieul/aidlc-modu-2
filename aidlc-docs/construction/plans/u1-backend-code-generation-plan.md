# U1 Backend — Code Generation Plan (v2.2)

> **Stage**: CONSTRUCTION · U1 Backend · Code Generation Part 1 (Planning) Step 1~9 산출물
> **Inputs**: [`unit-of-work.md`](../../inception/application-design/unit-of-work.md) · [`unit-of-work-story-map.md`](../../inception/application-design/unit-of-work-story-map.md) · [`components.md`](../../inception/application-design/components.md) · [`component-methods.md`](../../inception/application-design/component-methods.md) · [`business-logic-model.md`](../u1-backend/functional-design/business-logic-model.md) · [`business-rules.md`](../u1-backend/functional-design/business-rules.md) · [`domain-entities.md`](../u1-backend/functional-design/domain-entities.md) · [`tech-stack-decisions.md`](../u1-backend/nfr-requirements/tech-stack-decisions.md) · [`nfr-design-patterns.md`](../u1-backend/nfr-design/nfr-design-patterns.md) · [`logical-components.md`](../u1-backend/nfr-design/logical-components.md)

본 plan은 AI-DLC construction/code-generation.md Part 1 (Step 1~9) 산출물이다. **Part 2 (Step 10~13) 실행 시 본 plan이 단일 진실 소스**다.

---

## Section A — Unit Context

| 항목 | 값 |
|------|----|
| 유닛 | **U1 Backend** (`packages/backend`) |
| 책임 | REST 27 endpoint + SSE 11 이벤트 + 도메인 로직 + SQLite 영속 + 시드 데이터 |
| 1차 책임 스토리 | 25/26 (US-C0.2 제외, 외 모두) |
| 공유 의존 | `packages/shared` (DTO + SSE 이벤트 타입 + Enum) — 본 사이클 내 함께 정의 |
| 클라이언트 의존 | 없음 (U2/U3은 후속 사이클에서 본 유닛 dev 서버를 향해 진행) |
| 기술 스택 | TypeScript · NestJS 10 · TypeORM + better-sqlite3 (WAL) · class-validator · @nestjs/jwt + bcrypt · @nestjs/event-emitter · @nestjs/swagger · qrcode |
| 워크스페이스 | pnpm workspaces (`packages/*`) |

---

## Section B — Code Location

- **Application code**: `/Users/isco/ai/work/projects/AWS_AI_DLC/aidlc-modu/packages/backend/`, `/Users/isco/ai/work/projects/AWS_AI_DLC/aidlc-modu/packages/shared/`, 루트 `/Users/isco/ai/work/projects/AWS_AI_DLC/aidlc-modu/`
- **Documentation**: `/Users/isco/ai/work/projects/AWS_AI_DLC/aidlc-modu/aidlc-docs/construction/u1-backend/code/` (markdown summary only)
- 절대 `aidlc-docs/` 안에 코드를 두지 않음.

---

## Section C — 단계별 실행 계획 (Step 1 ~ Step 18)

각 항목은 Part 2에서 순서대로 실행한다. **체크박스 [x]는 Part 2 실행 후 표시**.

### Step 1 — Workspace 루트 셋업

생성 파일:
- `package.json` (workspace 루트 — name, private, scripts: dev/build/test/seed/lint, devDependencies로 typescript/prettier 일부 공유)
- `pnpm-workspace.yaml` (`packages: - 'packages/*'`)
- `tsconfig.base.json` (compiler options + path mapping `@table-order/shared`)
- `.gitignore` (node_modules, dist, data/, .env, *.log)
- `.editorconfig` (utf-8, lf, indent_size 2)
- `.env.example` (PORT, DB_PATH, JWT_SECRET, CORS_ORIGINS, LOG_LEVEL)

- [ ] Step 1 완료

### Step 2 — `packages/shared` 패키지 (DTO + SSE 타입)

생성:
- `packages/shared/package.json` (name: `@table-order/shared`, main: `dist/index.js`, scripts.build: tsc)
- `packages/shared/tsconfig.json` (extends ../../tsconfig.base, outDir dist, declaration true)
- `packages/shared/src/index.ts` (전 export)
- `packages/shared/src/enums/ad-slot.enum.ts`
- `packages/shared/src/enums/session-status.enum.ts`
- `packages/shared/src/dto/auth.dto.ts` — LoginRequest, LoginResponse
- `packages/shared/src/dto/qr.dto.ts` — QrScanResponse
- `packages/shared/src/dto/menu.dto.ts` — MenuDto, CreateMenuDto, UpdateMenuDto, MenuSortDto, SoldoutToggleDto
- `packages/shared/src/dto/cart.dto.ts` — CartItemDto, CartDto, AddCartItemDto, UpdateCartItemDto
- `packages/shared/src/dto/order.dto.ts` — OrderItemDto, OrderDto, CreateOrderResponse
- `packages/shared/src/dto/table.dto.ts` — TableDto, CreateTableDto, QrRegenerateResponse
- `packages/shared/src/dto/admin.dto.ts` — DashboardDto (TableCardDto 포함), HistoryQueryDto, OrderHistoryDto
- `packages/shared/src/dto/ads.dto.ts` — AdvertisementDto
- `packages/shared/src/sse-events/session-channel.ts` — SessionSseEvent union
- `packages/shared/src/sse-events/store-channel.ts` — StoreSseEvent union

각 DTO에 class-validator 데코레이션 부착 (Functional Design business-rules.md §3 표 그대로).

- [ ] Step 2 완료

### Step 3 — `packages/backend` 프로젝트 셋업

생성:
- `packages/backend/package.json` (NestJS 10 + deps from tech-stack-decisions.md §2)
- `packages/backend/tsconfig.json`, `tsconfig.build.json`
- `packages/backend/nest-cli.json`
- `packages/backend/.eslintrc.js`, `.prettierrc`
- `packages/backend/jest.config.js`, `test/jest-e2e.json`
- `packages/backend/.gitignore`
- `packages/backend/data/.gitkeep` (SQLite 파일 위치)

- [ ] Step 3 완료

### Step 4 — DB DataSource + Entities (TypeORM)

생성 (`packages/backend/src/db/`):
- `data-source.ts` — DataSourceOptions + PRAGMA WAL/synchronous/foreign_keys
- `entities/` 13개:
  - store.entity.ts
  - store-user.entity.ts
  - table.entity.ts
  - table-session.entity.ts
  - session-participant.entity.ts
  - cart.entity.ts
  - cart-item.entity.ts
  - order.entity.ts
  - order-item.entity.ts
  - order-history.entity.ts
  - menu.entity.ts
  - menu-category.entity.ts
  - advertisement.entity.ts
- `entities/index.ts` — 일괄 export

엔티티는 [`domain-entities.md`](../u1-backend/functional-design/domain-entities.md) 컬럼·인덱스·제약·cascade 그대로 매핑. **TableSession에 partial unique** `(tableId WHERE status='ACTIVE')` 적용.

- [ ] Step 4 완료

### Step 5 — Common 인프라 (가드·필터·인터셉터·파이프)

생성 (`packages/backend/src/common/`):
- `exceptions/business.exception.ts` — `BusinessException(code, message?)`
- `filters/http-exception.filter.ts` — 통합 응답 직렬화
- `interceptors/logging.interceptor.ts` — entry/exit + duration + password redact
- `guards/jwt-auth.guard.ts`
- `guards/store-scope.guard.ts`
- `guards/qr-token.guard.ts`
- `guards/session-scope.guard.ts`
- `guards/rate-limit.guard.ts`
- `common.module.ts` — 위 provider export

- [ ] Step 5 완료

### Step 6 — AuthModule

생성 (`packages/backend/src/modules/auth/`):
- `auth.module.ts`
- `auth.controller.ts` — POST `/admin/auth/login`, POST `/admin/auth/logout`
- `auth.service.ts` — login + bcrypt + AU-1 lock + JWT 30일 sign
- `jwt.strategy.ts` — passport-jwt
- `dto/` (shared에서 re-export)
- 단위 테스트 `auth.service.spec.ts` — login success/실패/lock 시나리오

- [ ] Step 6 완료

### Step 7 — StoreModule

생성:
- `store.module.ts`, `store.service.ts` (assertActive 등 read), `store.repository.ts`

- [ ] Step 7 완료

### Step 8 — TableModule

생성:
- `table.module.ts`
- `table.service.ts` — scanQr (UC-1), createTable (US-A3.1), regenerateQr (UC-6 + closeActiveSession cascade), closeActiveSession (UC-4), getOrCreateActiveSession (UC-3 호출용), revokeAllParticipants, generateQrImage (qrcode lib)
- `table.controller.ts` (고객 측 — POST `/qr/scan/:token`)
- `admin-table.controller.ts` (관리자 측 — POST `/admin/tables`, POST `/admin/tables/:id/qr/regenerate`, GET `/admin/tables/:id/qr.png|pdf`, POST `/admin/tables/:id/session/close`, GET `/admin/tables`)
- 단위 테스트 `table.service.spec.ts` — UC-1·UC-4·UC-6 핵심 시나리오 mock

- [ ] Step 8 완료

### Step 9 — MenuModule

생성:
- `menu.module.ts`
- `menu.service.ts` — listForCustomer/Admin, create, update, delete (UC-8 카트 충돌 검사), reorder, toggleSoldout (UC-5 fan-out), assertNotSoldout
- `menu.controller.ts` (고객 GET `/menus`)
- `admin-menu.controller.ts` (POST/PATCH/DELETE/PATCH sort/PATCH soldout)
- 단위 테스트 `menu.service.spec.ts` — UC-5·UC-8 + 가격 검증 + soldout 보존

- [ ] Step 9 완료

### Step 10 — CartModule

생성:
- `cart.module.ts`
- `cart.service.ts` — getCart, addItem (UC-2), updateItem, removeItem, clear, snapshotForOrder, FOR UPDATE lock + version++
- `cart.controller.ts` — GET/POST/PATCH/DELETE 5종
- 단위 테스트 `cart.service.spec.ts` — UC-2 + CR-6 version 단조 증가 + 품절 거부

- [ ] Step 10 완료

### Step 11 — OrderModule

생성:
- `order.module.ts`
- `order.service.ts` — createOrder (UC-3 — Table+Cart+Menu 협력 트랜잭션), listForSession, deleteByAdmin (UC-7 — 활성 세션만), moveSessionOrdersToHistory, listHistory (US-A3.4)
- `order.controller.ts` (고객 GET/POST `/sessions/:sid/orders`)
- `admin-order.controller.ts` (DELETE `/admin/orders/:id`, GET `/admin/history`)
- 단위 테스트 `order.service.spec.ts` — UC-3 스냅샷 CR-4 + UC-7 ORDER_IN_HISTORY 거부

- [ ] Step 11 완료

### Step 12 — SseModule

생성:
- `sse.module.ts`
- `sse.service.ts` — Map<sessionId, Subject> + Map<storeId, Subject> + keep-alive 15초
- `sse.event-router.ts` — `@OnEvent` 8개 (nfr-design-patterns.md §3.3)
- `sse.controller.ts` — `@Sse('sessions/:sessionId')`, `@Sse('stores/:storeId')`
- 단위 테스트 `sse.service.spec.ts` — emit/subscribe roundtrip

- [ ] Step 12 완료

### Step 13 — AdsModule

생성:
- `ads.module.ts`, `ads.service.ts` (listActive(slot?)), `ads.controller.ts` (GET `/ads`)
- 단위 테스트 `ads.service.spec.ts`

- [ ] Step 13 완료

### Step 14 — AdminModule (대시보드 read-only orchestration)

생성:
- `admin.module.ts`
- `admin-dashboard.service.ts` — getDashboard(storeId): TableCardDto[] (Table + 활성 세션 + 최신 주문 미리보기 N개)
- `admin-dashboard.controller.ts` — GET `/admin/dashboard`
- 단위 테스트 `admin-dashboard.service.spec.ts`

- [ ] Step 14 완료

### Step 15 — Seed Bootstrap

생성:
- `src/seed/seed.module.ts`
- `src/seed/seed.service.ts` — idempotent 시드 (Store 1, StoreUser 2, MenuCategory 3, Menu 12, Table 5 + qrToken, Advertisement 2)
- `src/seed/seed.cli.ts` — NestFactory.createApplicationContext + run + exit (npm script `pnpm seed`)

- [ ] Step 15 완료

### Step 16 — AppModule + main.ts (부트스트랩)

생성:
- `src/app.module.ts` — TypeOrmModule.forRoot + EventEmitterModule.forRoot + ConfigModule + 9 도메인 모듈 + CommonModule + AdsModule + SeedModule
- `src/main.ts` — bootstrap (CORS·Swagger·ValidationPipe·HttpExceptionFilter·LoggingInterceptor·listen)

- [ ] Step 16 완료

### Step 17 — e2e 테스트 (Supertest)

생성 (`packages/backend/test/`):
- `setup.ts` — in-memory(또는 별도 파일) SQLite + 시드
- `auth.e2e-spec.ts` — US-A1.1·A1.2·A1.3 (정상 / 비밀번호 오류 / 5회 lock)
- `qr-scan.e2e-spec.ts` — UC-1 (정상 + QR_REVOKED + 같은 폰 재진입)
- `cart.e2e-spec.ts` — UC-2 (추가·수정·삭제·비우기 + CR-6 version + 품절 거부)
- `order.e2e-spec.ts` — UC-3 + UC-4 + UC-7 (스냅샷 + 빈 세션 종료 history 미기록 + ORDER_IN_HISTORY)
- `menu.e2e-spec.ts` — UC-5 (soldout fan-out) + UC-8 (MENU_IN_CART 409→400) + 가격 검증
- `sse.e2e-spec.ts` — `cart.updated` SSE 수신 timing + 매장 채널 `order.created`

- [ ] Step 17 완료

### Step 18 — 문서 (markdown only) + README

생성:
- `aidlc-docs/construction/u1-backend/code/code-generation-summary.md` — 생성된 파일 목록 + 매핑(스토리/UC ↔ 파일)
- `packages/backend/README.md` — quick start (`pnpm install` → `pnpm seed` → `pnpm dev`) + Swagger UI URL
- `packages/shared/README.md` — DTO/SSE 타입 안내

- [ ] Step 18 완료

---

## Section D — 스토리 → 파일 traceability

| Story | NestJS 모듈 | 핵심 파일 |
|-------|-------------|-----------|
| US-C0.1·C0.2 | (U1 책임 없음 — 클라이언트) | — |
| US-C1.1 | TableModule | table.service.ts (scanQr), table.controller.ts |
| US-C2.1 | MenuModule + AdsModule | menu.service.ts (listForCustomer), ads.service.ts |
| US-C3.1·3.2·3.3·3.4 | CartModule + MenuModule + SseModule | cart.service.ts, sse.event-router.ts |
| US-C4.1·4.2 | OrderModule + CartModule + TableModule + MenuModule + SseModule | order.service.ts (createOrder) |
| US-C5.1 | OrderModule + SseModule | order.service.ts (listForSession), sse.event-router.ts |
| US-C6.1 | AdsModule | ads.service.ts |
| US-A1.1·1.2·1.3 | AuthModule | auth.service.ts, rate-limit.guard.ts |
| US-A2.1·2.2·2.3 | AdminModule + SseModule | admin-dashboard.service.ts, sse 매장 채널 |
| US-A3.1 | TableModule | table.service.ts (createTable, regenerateQr, generateQrImage) |
| US-A3.2 | OrderModule + SseModule | order.service.ts (deleteByAdmin) |
| US-A3.3 | TableModule + OrderModule + CartModule + SseModule | table.service.ts (closeActiveSession cascade) |
| US-A3.4 | OrderModule | order.service.ts (listHistory) |
| US-A4.1·4.2·4.3·4.4 | MenuModule + SseModule | menu.service.ts (create/update/delete/reorder/toggleSoldout) |

---

## Section E — 실행 옵션 (Part 2 진입 시 사용자 결정)

Part 2는 18 단계를 순차로 실행한다. 사용자는 다음 중 선택:

- **자동 진행 (권장 워크샵)**: Part 2 시작 시 한 번에 모든 단계 실행. 각 step 완료 후 plan 체크박스 [x] 갱신. Step 14에서 통합 summary 제시.
- **단계별 확인**: 각 step 완료마다 사용자 확인 후 다음으로. 시간 ↑.

Part 2 시작 시점에 사용자 결정.

---

## Section F — Part 2 완료 조건

- 모든 [ ] → [x] 변경
- 26 스토리 중 25개 (U1 책임) 모두 코드 매핑 완료
- `pnpm install` → `pnpm --filter @table-order/backend seed` → `pnpm --filter @table-order/backend dev` 동작 가능
- Swagger UI `/api/docs` 진입 가능
- 단위 + e2e 테스트 모두 작성 (실행은 Build and Test 단계)
- `aidlc-docs/construction/u1-backend/code/code-generation-summary.md` 생성
