# U2 Customer Web — Tech Stack Decisions (v2.2)

> **Stage**: CONSTRUCTION · U2 · NFR Requirements Step 6 산출물 (2/2)

---

## 1. 결정 통합

| 영역 | 결정 |
|------|------|
| 언어 | TypeScript (strict) |
| UI | React 18 |
| 빌드 | Vite 5 + @vitejs/plugin-react |
| 라우터 | react-router-dom 6 (BrowserRouter) |
| 데이터 | TanStack Query 5 |
| SSE | 브라우저 내장 `EventSource` |
| 스타일 | Plain CSS + CSS 변수 (rem 단위 토큰) — 빠른 PoC. 큰 라이브러리 없음 |
| PWA | vite-plugin-pwa (Workbox) |
| 폼 | (없음 — read·tap 기반) |
| 토스트 | 자체 구현 (Context + useReducer, 200줄 미만) |
| 테스트 | Vitest + @testing-library/react + jsdom + MSW |
| 코드 | ESLint + Prettier (vite-plugin-react 기본) |
| 공유 | `@table-order/shared` (DTO + SSE 이벤트 타입) |

## 2. 예상 `packages/customer-web/package.json`

```jsonc
{
  "name": "@table-order/customer-web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "vite --host --port 5173",
    "build": "tsc -b && vite build",
    "preview": "vite preview --port 5173",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint . --ext .ts,.tsx --fix"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.2",
    "@tanstack/react-query": "^5.59.0",
    "@table-order/shared": "workspace:*"
  },
  "devDependencies": {
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "vite": "^5.4.6",
    "vite-plugin-pwa": "^0.20.5",
    "typescript": "^5.3.3",
    "vitest": "^2.1.1",
    "@testing-library/react": "^16.0.1",
    "@testing-library/jest-dom": "^6.5.0",
    "jsdom": "^25.0.0",
    "msw": "^2.4.9",
    "eslint": "^8.57.0",
    "prettier": "^3.3.3"
  }
}
```

## 3. 설정 파일

### vite.config.ts
- React plugin
- vite-plugin-pwa(manifest + autoUpdate + workbox)
- proxy `/qr`, `/menus`, `/sessions`, `/ads`, `/sse`, `/admin` → `http://localhost:3000`

### PWA manifest
- name: "테이블오더"
- short_name: "주문"
- theme_color: #2C3E50
- icons: 192x192, 512x512 (단순 SVG placeholder)
- display: standalone
- start_url: /

### CSS 변수 토큰 (`src/styles/tokens.css`)
- `:root { --font-scale: 1; --bg: #ffffff; --fg: #1f2937; --primary: #2563eb; ... }`
- `.large-text { --font-scale: 1.5; }`
- `.high-contrast { --bg: #000000; --fg: #ffffff; --primary: #facc15; }`
- 모든 폰트는 `font-size: calc(1rem * var(--font-scale))` 형태

## 4. 미사용·금지

| 기술 | 사유 |
|------|------|
| Redux | TanStack Query만으로 충분 |
| Tailwind / styled-components | 워크샵 PoC 단순화 |
| Zod | shared가 class-validator로 통합 |
| Native iOS/Android | requirements out of scope |
| Web Push / FCM | 동상 (SSE 대체) |
