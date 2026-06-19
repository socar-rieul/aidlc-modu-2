# Unit of Work — 테이블오더 서비스 (v2.2)

> **Stage**: INCEPTION · Units Generation · Part 2 산출물 (1/3)
> **Inputs**: [`unit-of-work-plan.md`](../plans/unit-of-work-plan.md) · [`application-design.md`](application-design.md) · [`stories.md` v2.2 (26 스토리)](../user-stories/stories.md) · [`execution-plan.md`](../plans/execution-plan.md)

본 문서는 시스템을 **3개의 개발 유닛**으로 분해한 결과를 정의한다. 의존 관계는 [`unit-of-work-dependency.md`](unit-of-work-dependency.md), 스토리 매핑은 [`unit-of-work-story-map.md`](unit-of-work-story-map.md).

---

## 1. 유닛 분해 요약

| ID | 이름 | 책임 한 줄 | 패키지 | 스택 |
|----|------|------------|--------|------|
| **U1** | **Backend API + Domain** | REST + SSE + 도메인 로직 + SQLite 영속 | `packages/backend` | NestJS · TypeORM · class-validator · JWT · bcrypt · SSE |
| **U2** | **Customer Mobile Web (BYOD PWA)** | 본인 폰 브라우저로 QR 스캔·메뉴·공동 장바구니·주문·테이블 내역·광고·도움말·접근성 | `packages/customer-web` | React · TanStack Query · Vite · Service Worker (PWA) |
| **U3** | **Admin Dashboard (SPA)** | 매장 운영자/알바용 데스크톱 SPA — 로그인·실시간 그리드·메뉴·테이블·과거 내역 | `packages/admin-web` | React · TanStack Query · Vite |

**공유 패키지** (별도 유닛 아님): `packages/shared` — DTO + SSE 이벤트 타입 + Enum. 세 유닛 모두 import. 첫 코드 생성 사이클(U1) 안에 함께 정의·확장. (Q1 답변)

---

## 2. 유닛 상세

### 2.1 U1 — Backend API + Domain (`packages/backend`)

**미션**: 모든 도메인 비즈니스 로직·영속·실시간 푸시·시드 데이터의 단일 신뢰 소스. 두 클라이언트(U2/U3)는 본 유닛의 REST·SSE만 통해 협력한다.

**소속 NestJS 모듈** (Application Design components.md §1):
- AuthModule · StoreModule · TableModule · MenuModule · CartModule · OrderModule · SseModule · AdsModule · AdminModule · CommonModule

**소속 엔티티 (TypeORM, 13개)**: Store · StoreUser · Table · TableSession · SessionParticipant · Cart · CartItem · Order · OrderItem · OrderHistory · Menu · MenuCategory · Advertisement

**노출 인터페이스**:
- REST 27 endpoint (고객 11 + 관리자 16) — [`component-methods.md` §1](component-methods.md#1-rest-endpoint-카탈로그)
- SSE 11 이벤트 (세션 채널 6 + 매장 채널 5) — [`component-methods.md` §2](component-methods.md#2-sse-event-카탈로그)
- Swagger UI (`/api/docs`) — 디버깅·계약 검증

**비기능**:
- 매장ID·세션ID 스코프 격리(CR-1·CR-2), 주문 스냅샷(CR-4), 공동 장바구니 last-write-wins(CR-6).
- 시드 데이터 — Store 1, StoreUser 2(점주·알바), Table 5 + QR 토큰, MenuCategory 3, Menu 12, Advertisement 2.

**커버 스토리 (모든 26개의 서버 측)**: US-C0.1·C0.2(저장 영역), US-C1.1, C2.1, C3.1~3.4, C4.1·4.2, C5.1, C6.1, US-A1.1~A1.3, A2.1~A2.3, A3.1~A3.4, A4.1~A4.4. 자세한 매핑은 [`unit-of-work-story-map.md`](unit-of-work-story-map.md).

---

### 2.2 U2 — Customer Mobile Web / BYOD PWA (`packages/customer-web`)

**미션**: 손님이 본인 폰으로 QR을 찍은 직후의 모든 화면 흐름. 작은 화면·터치 우선·BYOD 호환·a11y 보조.

**소속 컴포넌트** (Application Design components.md §2):
- 페이지 5종: QrEntryPage, MenuPage, CartPage, OrderHistoryPage, HelpOverlay
- 컨테이너 4종: MenuListContainer, CartContainer, OrderListContainer, AdSlotContainer
- 컴포넌트 9종 + 훅 7종 (반응형·SSE·a11y·세션 토큰)

**비기능**: NFR-4(rem·터치 ≥44px / 큰 글자 모드 ≥60px), NFR-5(서버 권한·세션 토큰만 localStorage), NFR-11(반응형·PWA manifest 320~480px).

**커버 스토리 (12개 클라이언트 측)**: US-C0.1, C0.2, C1.1, C2.1, C3.1~C3.4, C4.1·C4.2, C5.1, C6.1.

---

### 2.3 U3 — Admin Dashboard (`packages/admin-web`)

**미션**: 매장 운영자가 영업 중 펼쳐놓는 데스크톱 화면. 실시간 그리드 + 메뉴/테이블/과거 내역 관리.

**소속 컴포넌트** (Application Design components.md §3):
- 페이지 5종: LoginPage, DashboardPage, MenuManagementPage, TableManagementPage, OrderHistoryPage
- 컨테이너 5종: TableGridContainer, OrderDetailModalContainer, MenuListContainer, TableListContainer, HistoryTableContainer
- 컴포넌트 9종 + 훅 6종 (JWT 자동 부착·SSE 매장 채널·QR PDF 다운로드)

**비기능**: NFR-2(JWT 30일 + 만료 감지), NFR-3(bcrypt 검증·시도 제한 UI), NFR-1(SSE ≤2초 그리드 갱신).

**커버 스토리 (14개 클라이언트 측)**: US-A1.1~A1.3, A2.1~A2.3, A3.1~A3.4, A4.1~A4.4.

---

## 3. Code Organization Strategy (Greenfield)

### 3.1 Repository 구조

```text
aidlc-modu/
├── package.json                # workspace 루트 (pnpm)
├── pnpm-workspace.yaml         # packages/* 등록
├── tsconfig.base.json          # 공통 TS 설정 + path mapping
├── packages/
│   ├── shared/                 # 공유 패키지 (별도 유닛 아님)
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── dto/            # REST DTO 8종 (auth/qr/menu/cart/order/table/admin/ads)
│   │       ├── sse-events/     # session-channel.ts + store-channel.ts
│   │       ├── enums/
│   │       └── index.ts
│   ├── backend/                # U1
│   │   ├── package.json        # NestJS + TypeORM + class-validator + bcrypt + uuid + qrcode
│   │   ├── tsconfig.json
│   │   ├── nest-cli.json
│   │   ├── ormconfig.ts        # SQLite DataSource
│   │   └── src/
│   │       ├── main.ts         # bootstrap (port 3000)
│   │       ├── app.module.ts
│   │       ├── modules/
│   │       │   ├── auth/        # controller/service/repository/dto/entity
│   │       │   ├── store/
│   │       │   ├── table/
│   │       │   ├── menu/
│   │       │   ├── cart/
│   │       │   ├── order/
│   │       │   ├── sse/
│   │       │   ├── ads/
│   │       │   └── admin/
│   │       ├── common/         # 가드·인터셉터·필터·EventEmitter2 wiring
│   │       └── seed/           # 시드 데이터 부트스트랩
│   ├── customer-web/           # U2 (vite + react)
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── index.html
│   │   ├── public/             # PWA manifest + icons
│   │   └── src/                # 컴포넌트 트리 (Application Design §2)
│   └── admin-web/              # U3 (vite + react)
│       ├── package.json
│       ├── vite.config.ts
│       ├── index.html
│       └── src/                # 컴포넌트 트리 (Application Design §3)
└── aidlc-docs/                 # (본 문서) — 코드와 분리
```

### 3.2 각 유닛 내부 폴더 패턴

- **U1 Backend**: NestJS 도메인 모듈 패턴. 모듈 한 폴더 = `controller.ts`, `service.ts`, `repository.ts`, `entity.ts`, `dto.ts` (shared에서 re-export), `module.ts`. cross-cutting은 `common/`.
- **U2 Customer Web**: `pages/`, `containers/`, `components/`, `hooks/`, `api/`, `styles/`, `pwa/`. 단방향 의존(Application Design component-dependency.md §5).
- **U3 Admin Web**: 동일 레이어 패턴. PWA 관련 폴더 없음.

### 3.3 빌드 / 실행 명령 (워크플로우 요약)

루트 `package.json` scripts:

```text
pnpm install                # workspace 전체 설치
pnpm --filter shared build  # shared 먼저 컴파일
pnpm --filter backend dev   # NestJS dev 서버 (port 3000)
pnpm --filter customer-web dev   # vite dev (port 5173)
pnpm --filter admin-web dev      # vite dev (port 5174)
pnpm --filter backend seed       # 시드 데이터 적재
pnpm test                   # 모든 패키지 테스트
pnpm build                  # 모든 패키지 빌드
```

상세 build/test instructions는 Construction Phase의 `build-and-test/build-instructions.md` 산출물에서 정의.

---

## 4. Construction 진행 순서 (Q2 답변)

```text
┌─────────────────────────────────────────────────────────────┐
│  U1 Backend                                                  │
│  Functional Design → NFR Req → NFR Design → Code Generation  │
│  + shared 패키지 초기 정의 (dto/sse-events) 동반              │
└─────────────────────┬───────────────────────────────────────┘
                      ▼  (Backend dev 서버·Swagger UI 가용)
┌─────────────────────────────────────────────────────────────┐
│  U2 Customer Web                                             │
│  Functional Design → NFR Req → NFR Design → Code Generation  │
└─────────────────────┬───────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  U3 Admin Web                                                │
│  Functional Design → NFR Req → NFR Design → Code Generation  │
└─────────────────────┬───────────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────────┐
│  Build and Test (전체 통합)                                  │
│  build-instructions / unit-test / integration-test           │
│  + e2e 시나리오 (QR 스캔 → 카트 → 주문 → 대시보드 반영)       │
└──────────────────────────────────────────────────────────────┘
```

- 시간 부족 시 후반 유닛 압축은 사용자 요청 시 수행.
- Infrastructure Design은 SKIP (NFR-8 로컬 한정).

---

## 5. 유닛 간 통신 계약(Contract) 위치 (Q3 답변)

| 항목 | 위치 | 갱신 주체 |
|------|------|-----------|
| 코드 SSOT | `packages/shared/src/` | U1 Code Generation 사이클이 시작 시점에 정의, U2/U3 사이클이 import만. 후속 추가는 사용자 승인 후 shared 직접 수정. |
| 문서 SSOT | [`component-methods.md` §1·§2](component-methods.md) | Application Design 단계 산출. v2.2 정합성 정정 반영. 이후 Functional Design은 method body 룰만 추가, contract endpoint 변경은 다시 Application Design 갱신. |
| 시퀀스 SSOT | [`component-dependency.md` §4](component-dependency.md#4-핵심-use-case-시퀀스-다이어그램-3개) | 동일 — 변경 시 Application Design 단계로 회귀. |

---

## 6. 산출물 위치

```text
aidlc-docs/inception/
├── plans/
│   └── unit-of-work-plan.md            ← Plan (Part 1)
└── application-design/
    ├── unit-of-work.md                 ← 본 문서 (Part 2)
    ├── unit-of-work-dependency.md
    └── unit-of-work-story-map.md
```
