# @table-order/shared

REST DTO + SSE 이벤트 union 타입 + enum. backend·customer-web·admin-web 모두 import.

## 카탈로그

- `dto/` — auth, qr, menu, cart, order, table, admin, ads (class-validator 데코레이션 부착)
- `sse-events/session-channel` — `SessionSseEvent` union (cart.updated · cart.cleared · order.created · order.deleted · menu.soldout.changed · session.closed · keep-alive)
- `sse-events/store-channel` — `StoreSseEvent` union (session.started · session.closed · order.created · order.deleted · menu.soldout.changed · keep-alive)
- `enums/` — `AdSlot`, `SessionStatus`

## 빌드

```bash
pnpm --filter @table-order/shared build
```
