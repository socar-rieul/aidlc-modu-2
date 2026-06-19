# Build Instructions — 테이블오더 서비스 (v2.2)

## Prerequisites

| 항목 | 값 |
|------|----|
| **Build Tool** | pnpm 11.x + Vite 5 + NestJS CLI 10 + TypeScript 5.3 |
| **Runtime** | Node.js ≥ 20 LTS (테스트 환경: Node 25 — 일부 native build 직접 트리거 필요) |
| **OS** | macOS (Xcode CLT) / Linux (build-essential + python3) |
| **Memory** | ≥ 4GB |
| **Disk** | ≥ 1GB (node_modules ~300MB + 빌드 산출물 ~10MB) |
| **외부 의존** | 없음 (NFR-8 로컬 단일 머신) |

### 환경 변수 (선택 — 기본값으로 충분)

루트 `.env.example` 복사 → `.env`.

```dotenv
PORT=3000
DB_PATH=./packages/backend/data/app.sqlite
JWT_SECRET=replace-with-256bit-random
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
LOG_LEVEL=debug
```

> **워크샵 빠른 시작은 env 미설정으로도 동작** (코드 내부 기본값 + JWT_SECRET 미설정 시 admin 인증만 실패 → 시드 직후 `JWT_SECRET=test-secret` 정도면 충분).

## Build Steps

### 1. 의존 설치 (1회)

```bash
# 루트
pnpm install
```

> **예외**: pnpm 11이 native build script를 기본 차단한다. Node 25 + better-sqlite3 11.10 조합은 prebuild binary가 없어 직접 빌드해야 한다. install 직후 다음을 1회 수행:
>
> ```bash
> cd node_modules/.pnpm/better-sqlite3@11.10.0/node_modules/better-sqlite3 && npx --yes node-gyp rebuild --release && cd -
> ```
>
> Node 20 LTS 환경이라면 prebuild binary가 자동 다운로드되므로 이 단계는 생략 가능.

### 2. Shared 패키지 빌드 (1회)

```bash
cd packages/shared && npx tsc -p tsconfig.json && cd -
# 또는
pnpm --filter @table-order/shared build
```

`packages/shared/dist/`에 `.js` + `.d.ts` 생성. backend·customer-web·admin-web 모두 본 dist를 import.

### 3. 시드 데이터 적재 (1회)

```bash
pnpm --filter @table-order/backend seed
```

데모 매장 1 + StoreUser 2 + MenuCategory 3 + Menu 12 + Table 5(qrToken UUIDv4) + Advertisement 2 idempotent INSERT. `packages/backend/data/app.sqlite` 파일 생성.

### 4. 유닛별 dev 서버 기동 (각 터미널)

```bash
# Terminal 1 — Backend (port 3000)
pnpm --filter @table-order/backend dev

# Terminal 2 — Customer Web (port 5173)
pnpm --filter @table-order/customer-web dev

# Terminal 3 — Admin Web (port 5174)
pnpm --filter @table-order/admin-web dev
```

### 5. Production 빌드 (선택)

```bash
pnpm --filter @table-order/backend build       # dist/main.js
pnpm --filter @table-order/customer-web build  # dist/ (~220KB / gzip 70KB)
pnpm --filter @table-order/admin-web build     # dist/ (~227KB / gzip 72KB)
```

## Verify Build Success

| 단위 | 성공 신호 |
|------|-----------|
| pnpm install | `Done in Ns` |
| shared build | `packages/shared/dist/index.{js,d.ts}` 생성 |
| backend seed | 콘솔 "Seed applied: 데모 매장 + 5 테이블 + 12 메뉴 + 2 광고" |
| backend dev | `Listening on http://localhost:3000  (docs: /api/docs)` |
| customer-web dev | `VITE v5.x ready in ... ms. Local: http://localhost:5173/` |
| admin-web dev | `VITE v5.x ready in ... ms. Local: http://localhost:5174/` |
| backend production build | NestJS `Compilation successful` + `dist/main.js` |
| customer-web build | `built in <1s` + PWA `sw.js` + `workbox-*.js` 생성 |
| admin-web build | `built in <1s` |

### Common Warnings (무시 가능)

- `[WARN] X deprecated subdependencies found` — pnpm install 시 정상
- `Warning: --localstorage-file was provided without a valid path` — vitest + jsdom 25 호환 경고, polyfill 적용으로 무해
- `[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts` — bcrypt/better-sqlite3 native build 차단 안내. better-sqlite3는 위 1단계 후속 빌드로 해소, bcrypt는 bcryptjs로 교체됨

## Troubleshooting

### Build Fails with "ERR_PNPM_IGNORED_BUILDS"
- **원인**: pnpm 11이 native module(`better-sqlite3`) build script를 보안 정책으로 차단
- **해결**: 위 1단계 직후 `cd node_modules/.pnpm/better-sqlite3@*/node_modules/better-sqlite3 && npx node-gyp rebuild --release` 수동 트리거

### Backend dev 시작 시 `MODULE_NOT_FOUND: better_sqlite3.node`
- **원인**: native binary 미빌드
- **해결**: 동상 — node-gyp rebuild

### Customer/Admin Web build 시 `Cannot find module '@table-order/shared'`
- **원인**: shared 패키지 dist 미생성
- **해결**: `pnpm --filter @table-order/shared build` 먼저 실행

### Backend SSE 연결 시 401
- **원인**: 가드(JwtAuthGuard / QrTokenGuard)에 EventSource 토큰 미부착
- **해결**: EventSource는 헤더 미지원이므로 워크샵 PoC에서 SSE 컨트롤러는 가드 우회 또는 token query 지원이 필요할 수 있음. 자세한 사항은 [`nfr-design-patterns.md` §3](../u2-customer-web/nfr-design/nfr-design-patterns.md) 메모 참조.

### Vitest 단위 테스트에서 `localStorage.getItem is not a function`
- **원인**: Node 25 + jsdom 25 호환 이슈
- **해결**: `src/test-setup.ts`에 인메모리 polyfill 이미 적용됨. setupFiles 로드 확인.
