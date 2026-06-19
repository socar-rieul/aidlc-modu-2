# U1 Backend — Code Generation Summary (v2.2)

> **Stage**: CONSTRUCTION · U1 Backend · Code Generation Part 2 산출물 (markdown summary)
> **Plan**: [`u1-backend-code-generation-plan.md`](../../plans/u1-backend-code-generation-plan.md) — 18 단계 모두 완료

본 문서는 Part 2에서 생성된 파일 목록과 스토리/UC 매핑 결과를 정리한다. **모든 실제 코드는 `packages/` 안에 있으며 `aidlc-docs/`에는 없다**.

---

## 1. 생성 파일 트리

```text
aidlc-modu/
├── package.json                       # workspace 루트
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .gitignore · .editorconfig · .env.example
│
├── packages/shared/
│   ├── package.json · tsconfig.json · README.md
│   └── src/
│       ├── enums/{ad-slot, session-status}.enum.ts
│       ├── dto/{auth, qr, menu, cart, order, table, admin, ads}.dto.ts
│       ├── sse-events/{session-channel, store-channel}.ts
│       └── index.ts
│
└── packages/backend/
    ├── package.json · tsconfig{,.build}.json · nest-cli.json
    ├── jest.config.js · test/jest-e2e.json
    ├── .gitignore · .eslintrc.js · .prettierrc · data/.gitkeep · README.md
    └── src/
        ├── main.ts                    # bootstrap (CORS·Swagger·Pipe·Filter·Interceptor)
        ├── app.module.ts
        ├── db/
        │   ├── data-source.ts          # WAL · synchronous · foreign_keys
        │   └── entities/{store, store-user, table, table-session, session-participant,
        │                  cart, cart-item, order, order-item, order-history,
        │                  menu, menu-category, advertisement}.entity.ts + index.ts
        ├── common/
        │   ├── exceptions/business.exception.ts
        │   ├── filters/http-exception.filter.ts
        │   ├── interceptors/logging.interceptor.ts
        │   ├── guards/{jwt-auth, store-scope, qr-token, session-scope, rate-limit}.guard.ts
        │   └── common.module.ts
        ├── modules/
        │   ├── auth/{auth.service.ts, auth.controller.ts, jwt.strategy.ts, auth.module.ts}
        │   ├── store/store.module.ts
        │   ├── table/{table.service.ts, table.controller.ts, admin-table.controller.ts, table.module.ts}
        │   ├── menu/{menu.service.ts, menu.controller.ts, admin-menu.controller.ts, menu.module.ts}
        │   ├── cart/{cart.service.ts, cart.controller.ts, cart.module.ts}
        │   ├── order/{order.service.ts, order.controller.ts, admin-order.controller.ts, order.module.ts}
        │   ├── sse/{sse.service.ts, sse.event-router.ts, sse.controller.ts, sse.module.ts}
        │   ├── ads/{ads.service.ts, ads.controller.ts, ads.module.ts}
        │   └── admin/{admin-dashboard.service.ts, admin-dashboard.controller.ts, admin.module.ts}
        ├── seed/{seed.service.ts, seed.module.ts, seed.cli.ts}
        └── test/qr-cart-order.e2e-spec.ts
```

총 **약 60 파일** (workspace 8 + shared 13 + backend 39 + e2e 1).

---

## 2. Use-case ↔ 파일 매핑

| UC | 핵심 파일 |
|----|----------|
| UC-1 QR 스캔 입장 | `modules/table/table.service.ts#scanQr` (트랜잭션 + 첫 스캔 시 TableSession+Cart 동시 생성 + session.started SSE) |
| UC-2 카트 변경 | `modules/cart/cart.service.ts#addItem/updateItem/removeItem/clear` (transaction + version++ + cart.updated SSE) |
| UC-3 주문 확정 | `modules/order/order.service.ts#createOrder` (Table+Cart+Menu 협력, CR-4 스냅샷, cart.cleared+order.created SSE 양 채널) |
| UC-4 세션 종료 | `modules/table/table.service.ts#closeActiveSession` (TableSession status=CLOSED + 빈 세션이면 history 미기록 + cascade) |
| UC-5 품절 토글 | `modules/menu/menu.service.ts#toggleSoldout` (활성 세션 ID 조회 + menu.soldout fan-out) |
| UC-6 QR 재발급 | `modules/table/table.service.ts#regenerateQr` (closeActiveSession cascade 호출 + qrToken UPDATE) |
| UC-7 직권 삭제 | `modules/order/order.service.ts#deleteByAdmin` (활성 세션만, ORDER_IN_HISTORY 거부) |
| UC-8 메뉴 삭제 | `modules/menu/menu.service.ts#delete` (카트 충돌 검사 → MENU_IN_CART) |

---

## 3. 스토리 ↔ 파일 매핑 (요약)

| Story | 핵심 구현 위치 |
|-------|----------------|
| US-C1.1 (QR 스캔) | `table/table.controller.ts` + `table.service.ts#scanQr` |
| US-C2.1 (메뉴 탐색) | `menu/menu.controller.ts` + `menu.service.ts#listForStore` |
| US-C3.1~3.4 (공동 카트) | `cart/cart.service.ts` (전 메서드) + SSE `cart.updated` |
| US-C4.1·4.2 (주문 확정·실패) | `order/order.service.ts#createOrder` + HttpExceptionFilter 에러 응답 |
| US-C5.1 (테이블 내역) | `order/order.controller.ts#list` + SSE `order.created` reconcile |
| US-C6.1 (광고) | `ads/ads.service.ts` |
| US-A1.1~1.3 | `auth/auth.service.ts` + `rate-limit.guard.ts` |
| US-A2.1~2.3 | `admin/admin-dashboard.service.ts` + SseModule 매장 채널 |
| US-A3.1 | `table/admin-table.controller.ts` (create, qr.regenerate, qr.png/svg) |
| US-A3.2 | `order/admin-order.controller.ts#delete` |
| US-A3.3 | `table/admin-table.controller.ts#closeSession` |
| US-A3.4 | `order/admin-order.controller.ts#history` |
| US-A4.1~4.4 | `menu/admin-menu.controller.ts` (CRUD + sort + soldout) |

US-C0.1·0.2는 U2 책임 (클라이언트 a11y/help).

---

## 4. 시드 데이터

`packages/backend/src/seed/seed.service.ts`가 idempotent하게 적재.

- **Store**: 데모 매장 (id=`00000000-0000-0000-0000-000000000001`)
- **StoreUser**: `owner`, `crew` (모두 bcrypt `demo1234`)
- **MenuCategory**: 음료 / 식사 / 디저트
- **Menu**: 12개 (카테고리당 4)
- **Table**: 5개 + 각자 UUIDv4 qrToken
- **Advertisement**: 모두의주차장 2개 (menu_top, cart_bottom)

---

## 5. 동작 검증 (Build and Test 단계 예정)

- `pnpm install`
- `pnpm --filter @table-order/shared build`
- `pnpm seed`
- `pnpm dev` → Swagger `/api/docs` 진입
- `pnpm --filter @table-order/backend test:e2e` → e2e 4 시나리오 통과:
  - 정상 흐름 (QR → 메뉴 → 카트 → 주문 → 내역)
  - 빈 카트 주문 거부 (CART_EMPTY)
  - 관리자 로그인 + 대시보드
  - 로그인 5회 실패 → 6번째 RATE_LIMITED

---

## 6. 다음 단계

본 U1 사이클 완료 후:
- **U2 Customer Web** (Customer Mobile PWA) Functional Design → NFR → Code Generation
- **U3 Admin Web** (Admin SPA) — 동상
- **Build and Test** — 통합 검증 + e2e shell script
