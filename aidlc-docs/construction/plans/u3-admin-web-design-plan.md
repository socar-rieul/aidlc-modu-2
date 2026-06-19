# U3 Admin Web — Design 3단계 통합 Plan (v2.2)

> **Stage**: CONSTRUCTION · U3 · Functional Design + NFR Requirements + NFR Design (압축)
> **Inputs**: [`unit-of-work.md`](../../inception/application-design/unit-of-work.md) · [`unit-of-work-story-map.md`](../../inception/application-design/unit-of-work-story-map.md) · [`components.md` §3](../../inception/application-design/components.md#3-admin-web-u3--react-spa-컴포넌트-트리) · [`stories.md` v2.2](../../inception/user-stories/stories.md)
> **방침**: U2 패턴 그대로 압축 진행. 사이클 끝에 1회 Approval Gate.

---

## Section A — 통합 결정 (질문 + 답변 일괄)

### A1. Functional Design

| Q | 결정 |
|---|------|
| 라우터 | **react-router-dom v6 BrowserRouter** — `/login`, `/`, `/menus`, `/tables`, `/history`. `RequireAuth` 가드. |
| 인증 | **JWT Bearer 헤더** (Authorization) — localStorage 영속 + 만료시각 비교 + 401 → `/login` 리다이렉트. |
| SSE | **매장 채널** `/sse/stores/:storeId` — `session.started`/`session.closed`/`order.created`/`order.deleted`/`menu.soldout.changed`. |
| 페이지 | LoginPage / DashboardPage(테이블 그리드) / MenuManagementPage / TableManagementPage / OrderHistoryPage. |
| QR 다운로드 | `<a href="/admin/tables/:id/qr.png">PNG</a>` 또는 `qr.svg` — 별도 인증 매뉴얼 처리 (Bearer fetch + Blob → URL.createObjectURL). |
| 폼 검증 | 클라이언트 사전 검증(가격 ≥ 1원·테이블 번호 ≥ 1·필수 필드) + 서버 errorCode → 토스트. |

### A2. NFR Requirements

| 항목 | 결정 |
|------|------|
| 빌드 | Vite 5 + @vitejs/plugin-react |
| UI | React 18 + TanStack Query 5 + react-router-dom 6 |
| 폼팩터 | 데스크톱 우선 (`min-width: 768px`), 태블릿 보조 |
| 테스트 | Vitest + @testing-library/react + jsdom |
| 코드 | TypeScript strict + ESLint + Prettier |
| 의존 | `@table-order/shared` + backend `http://localhost:3000` |

### A3. NFR Design

| 패턴 | 핵심 |
|------|------|
| **useAdminAuth** | localStorage(JWT, expiresAt) + 만료 체크 + login/logout + 자동 401 리다이렉트 |
| **API client** | fetch wrapper + Bearer 자동 부착 + 401 → JWT 폐기 + `/login` |
| **useStoreSseChannel** | EventSource `/sse/stores/:storeId` + 매장 채널 6 이벤트 → `invalidateQueries` 위주 (대시보드 단순 새로고침) |
| **TanStack Query 캐시** | `['dashboard']`, `['menus']`, `['tables']`, `['history', tableId, from, to]` |
| **QR 다운로드** | Bearer fetch → Blob → `<a download>` 트리거 |
| **로딩/에러** | 글로벌 토스트 (U2와 동일 패턴) + 페이지별 빈 상태 |

---

## Section B — 산출물 8종

- [x] Functional Design: business-logic-model.md + business-rules.md + domain-entities.md + frontend-components.md
- [x] NFR Requirements: nfr-requirements.md + tech-stack-decisions.md
- [x] NFR Design: nfr-design-patterns.md + logical-components.md
