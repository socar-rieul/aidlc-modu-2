# @table-order/backend (U1)

NestJS + TypeORM(SQLite WAL) + JWT + SSE 기반 테이블오더 백엔드.

## Quick Start

```bash
# 루트에서
pnpm install
pnpm seed       # 데모 매장 + 5 테이블 + 12 메뉴 + 2 광고 적재
pnpm dev        # NestJS dev 서버 (port 3000)
```

API 문서: <http://localhost:3000/api/docs>

## 환경 변수 (.env)

| 변수 | 예 |
|------|----|
| `PORT` | 3000 |
| `DB_PATH` | `./packages/backend/data/app.sqlite` |
| `JWT_SECRET` | 256-bit 랜덤 |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:5174` |

루트 `.env.example` 복사해서 사용.

## 데모 계정

| ID | 비밀번호 |
|----|---------|
| `owner@(매장ID)` | `demo1234` |
| `crew@(매장ID)` | `demo1234` |

매장ID 시드 값: `00000000-0000-0000-0000-000000000001`.

## 주요 endpoint

- 고객: `POST /qr/scan/:token`, `GET /menus`, `POST /sessions/:sid/cart/items`, `POST /sessions/:sid/orders`, `GET /ads`
- 관리자: `POST /admin/auth/login`, `GET /admin/dashboard`, `PATCH /admin/menus/:id/soldout`, `POST /admin/tables/:id/qr/regenerate`
- SSE: `GET /sse/sessions/:sid`, `GET /sse/stores/:storeId`

## 테스트

```bash
pnpm --filter @table-order/backend test:e2e
```
