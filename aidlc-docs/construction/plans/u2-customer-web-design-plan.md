# U2 Customer Web — Design 3단계 통합 Plan (v2.2)

> **Stage**: CONSTRUCTION · U2 · Functional Design + NFR Requirements + NFR Design (압축)
> **Inputs**: [`unit-of-work.md`](../../inception/application-design/unit-of-work.md) · [`unit-of-work-story-map.md`](../../inception/application-design/unit-of-work-story-map.md) · [`components.md` §2](../../inception/application-design/components.md#2-customer-web-u2--react-pwa-컴포넌트-트리) · [`stories.md` v2.2](../../inception/user-stories/stories.md) · [`requirements.md` v2 NFR-4·5·11·12](../../inception/requirements/requirements.md)
> **방침**: U1에서 권장안 일괄 채택 흐름 + 사용자 "빠르게" 요청 → 본 plan은 권장안 결정 요약 + 즉시 산출물 생성.

---

## Section A — 통합 결정 (질문 + 답변 일괄)

### A1. Functional Design

| Q | 결정 |
|---|------|
| 라우터 종류 | **react-router-dom v6 BrowserRouter** — `/qr/:token` → `/menu` 리다이렉트, `/cart`, `/orders`, `/help`. 404는 `/error/no-session`. |
| a11y 토글 적용 방식 | localStorage 영속 + `document.documentElement.classList.add('large-text','high-contrast')` + CSS 변수(`--font-scale`, `--bg`, `--fg`) + rem 토큰. 시스템 폰트 자동 반영. |
| 도움말 오버레이 트리거 | **첫 진입 자동** + `help.completedAt` localStorage 플래그. 헬프 버튼은 헤더에 항시 노출. 세션 종료 SSE 수신 시 플래그 리셋. |
| 라우팅 가드 | `useSessionToken()` 훅이 토큰 없으면 `/error/no-session` 리다이렉트. `/qr/:token`은 제외. |
| 주문 확정 강화 확인 | 별도 라우트 X. `ConfirmDialog` 컴포넌트로 모달 — 큰 글자 + 60×60 버튼. |

### A2. NFR Requirements

| 항목 | 결정 |
|------|------|
| 빌드 도구 | Vite 5 + @vitejs/plugin-react (HMR) |
| UI 프레임워크 | React 18 (concurrent) |
| 라우터 | react-router-dom 6 |
| 상태 | TanStack Query 5 + useState/useReducer |
| PWA | vite-plugin-pwa (manifest + service worker auto register) |
| 폼팩터 | 모바일 320~480px 우선, 큰 글자 모드 60×60px 터치 영역 |
| 테스트 | Vitest + @testing-library/react + MSW (mock backend), 커버리지 미강제 |
| 코드 스타일 | ESLint + Prettier (vite-plugin-react 기본) |
| 타입 | TypeScript strict, shared 패키지 import |
| 의존 백엔드 | `http://localhost:3000` (REST + SSE) — CORS 허용 origin |

### A3. NFR Design (구현 패턴)

| 패턴 | 핵심 |
|------|------|
| **useSseChannel** | `new EventSource(url)` + 이벤트 타입별 `addEventListener` → `queryClient.setQueryData` 또는 `invalidateQueries`. `onopen`/재연결 시 reconcile fetch. |
| **API client (`api/client.ts`)** | `fetch` 래퍼 + `X-Session-Token` 자동 부착(`useSessionToken`에서 read) + 4xx/5xx 통합 핸들링. 401 → 세션 폐기 + `/error/no-session`. |
| **localStorage 훅** | `useSessionToken`(token·sessionId·storeId·storeName·tableNumber), `useAccessibility`(largeText·highContrast), `useHelp`(completedAt). |
| **TanStack Query 캐시 키** | `['menu']`, `['cart', sessionId]`, `['orders', sessionId]`, `['ads', slot]`. staleTime=30s, gcTime=5m. |
| **라우팅** | `App.tsx`에서 `<BrowserRouter>` + `Routes` + `RequireSession` guard. |
| **a11y 적용** | `useAccessibility` 토글이 `document.documentElement.classList` 직접 조작. CSS에서 `.large-text *` 등 셀렉터로 `--font-scale: 1.5` 변수. |
| **에러 표시** | 토스트(Sonner 류 가벼운 라이브러리 또는 자체 구현 단순 useState) + 큰 글자 모달. errorCode 별 메시지 매핑. |

---

## Section B — 산출물 8종 (생성됨)

- [x] Functional Design
  - [`u2-customer-web/functional-design/business-logic-model.md`](../u2-customer-web/functional-design/business-logic-model.md)
  - [`u2-customer-web/functional-design/business-rules.md`](../u2-customer-web/functional-design/business-rules.md)
  - [`u2-customer-web/functional-design/domain-entities.md`](../u2-customer-web/functional-design/domain-entities.md) (클라이언트 모델: localStorage·React Query 캐시)
  - [`u2-customer-web/functional-design/frontend-components.md`](../u2-customer-web/functional-design/frontend-components.md)
- [x] NFR Requirements
  - [`u2-customer-web/nfr-requirements/nfr-requirements.md`](../u2-customer-web/nfr-requirements/nfr-requirements.md)
  - [`u2-customer-web/nfr-requirements/tech-stack-decisions.md`](../u2-customer-web/nfr-requirements/tech-stack-decisions.md)
- [x] NFR Design
  - [`u2-customer-web/nfr-design/nfr-design-patterns.md`](../u2-customer-web/nfr-design/nfr-design-patterns.md)
  - [`u2-customer-web/nfr-design/logical-components.md`](../u2-customer-web/nfr-design/logical-components.md)
