# U3 Admin Web — Tech Stack Decisions (v2.2)

> **Stage**: CONSTRUCTION · U3 · NFR Requirements Step 6 산출물 (2/2)

---

## 1. 결정 통합

| 영역 | 결정 |
|------|------|
| 언어 | TypeScript strict |
| UI | React 18 |
| 빌드 | Vite 5 + @vitejs/plugin-react |
| 라우터 | react-router-dom 6 |
| 데이터 | TanStack Query 5 |
| SSE | EventSource |
| 스타일 | Plain CSS + CSS 변수 (rem) |
| 폼 | useState 기반 (별도 라이브러리 X) |
| 토스트 | U2 동일 패턴 (Context + 큐) |
| 테스트 | Vitest + RTL + jsdom |
| PWA | **사용 안 함** (데스크톱) |
| 공유 | `@table-order/shared` |

## 2. 예상 package.json

```jsonc
{
  "name": "@table-order/admin-web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host --port 5174",
    "build": "tsc -b && vite build",
    "preview": "vite preview --port 5174",
    "test": "vitest run",
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
    "typescript": "^5.3.3",
    "vitest": "^2.1.1",
    "@testing-library/react": "^16.0.1",
    "@testing-library/jest-dom": "^6.5.0",
    "jsdom": "^25.0.0",
    "eslint": "^8.57.0",
    "prettier": "^3.3.3"
  }
}
```

## 3. vite.config

- proxy `/admin`·`/sse`·`/menus`·`/sessions`·`/qr`·`/ads` → backend:3000
- vitest 환경 jsdom + setupFiles
- PWA 플러그인 없음
