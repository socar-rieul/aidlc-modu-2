# U1 Backend — Domain Entities (v2.2)

> **Stage**: CONSTRUCTION · U1 Backend · Functional Design Step 6 산출물 (3/3)
> **Inputs**: [`business-logic-model.md`](business-logic-model.md) · [`business-rules.md`](business-rules.md) · [`components.md` §1.1](../../../inception/application-design/components.md#11-데이터-모델-매핑-requirementsmd-v2-§33--typeorm-엔티티)

본 문서는 U1 Backend의 **13개 엔티티 상세** — 컬럼·인덱스·제약·관계 cascade·라이프사이클 — 를 정의한다. TypeORM 데코레이션·마이그레이션은 Code Generation 단계 산출.

---

## 1. 엔티티 카탈로그 (13개)

```text
Store ───< StoreUser
  │
  ├──< Table ───< TableSession ───< SessionParticipant
  │                  │
  │                  ├── 1:1 Cart ───< CartItem
  │                  │
  │                  └──< Order ───< OrderItem
  │                            │
  │                            └── (종료 시) OrderHistory
  │
  ├──< MenuCategory ───< Menu
  │
  └── (system-wide) Advertisement
```

---

## 2. Store

| 컬럼 | 타입 | 제약 | 비고 |
|------|------|------|------|
| id | TEXT (UUID) | PK | crypto.randomUUID() |
| name | TEXT | NOT NULL | "데모 매장" 등 |
| active | BOOLEAN | NOT NULL DEFAULT 1 | 영업 종료 시 false → 신규 QR 스캔 거부 (TS-6) |
| createdAt | DATETIME | NOT NULL DEFAULT now | |
| updatedAt | DATETIME | NOT NULL | |

**관계**: 1 ↔ N — StoreUser, Table, MenuCategory, Menu (모두 storeId FK).

**라이프사이클**: 시드로 생성, 영업 종료 시 active=false 토글 (관리자 endpoint는 본 MVP 미포함, seed에서 직접 변경).

---

## 3. StoreUser

| 컬럼 | 타입 | 제약 | 비고 |
|------|------|------|------|
| id | TEXT (UUID) | PK | |
| storeId | TEXT (UUID) | NOT NULL, FK → Store | CR-1 스코프 |
| username | TEXT | NOT NULL | |
| passwordHash | TEXT | NOT NULL | bcrypt rounds≥10 (CR-5) |
| failedAttempts | INTEGER | NOT NULL DEFAULT 0 | AU-1 |
| lockUntil | DATETIME | NULL | AU-1 5분 lock |
| createdAt | DATETIME | NOT NULL DEFAULT now | |

**인덱스**: UNIQUE `(storeId, username)`.

**라이프사이클**:
- 시드: 점주·알바 2명 생성.
- 로그인 실패 시 failedAttempts +1, 5회 도달 시 lockUntil = now + 5분.
- 성공 시 failedAttempts=0, lockUntil=NULL.

---

## 4. Table

| 컬럼 | 타입 | 제약 | 비고 |
|------|------|------|------|
| id | TEXT (UUID) | PK | |
| storeId | TEXT (UUID) | NOT NULL, FK → Store | CR-1 |
| number | INTEGER | NOT NULL | 1~N 표시 번호 |
| qrToken | TEXT (UUIDv4) | NOT NULL, UNIQUE | TS-1, CR-5 |
| active | BOOLEAN | NOT NULL DEFAULT 1 | 운영상 비활성 옵션 |
| createdAt | DATETIME | NOT NULL DEFAULT now | |

**인덱스**:
- UNIQUE `(storeId, number)` — 동일 매장 번호 중복 방지 (`TABLE_NUMBER_DUPLICATE`).
- UNIQUE `qrToken` 단독.

**관계**: 1 ↔ N — TableSession, OrderHistory.

**라이프사이클**:
- 관리자 등록 (US-A3.1) → qrToken UUIDv4 발급.
- QR 재발급 (UC-6) → cascade 종료 + qrToken UPDATE.
- 삭제는 MVP 미포함.

---

## 5. TableSession

| 컬럼 | 타입 | 제약 | 비고 |
|------|------|------|------|
| id | TEXT (UUID) | PK | sessionId 별칭 |
| tableId | TEXT (UUID) | NOT NULL, FK → Table | |
| startedAt | DATETIME | NOT NULL DEFAULT now | 첫 스캔 시각 (v2.2) |
| endedAt | DATETIME | NULL | 종료 시 |
| status | TEXT | NOT NULL CHECK IN ('ACTIVE','CLOSED') | |

**인덱스**:
- **PARTIAL UNIQUE** `tableId WHERE status='ACTIVE'` — 테이블당 활성 1개 unique (TS-2). SQLite partial index 지원.
- INDEX `(tableId, status)` — 조회 최적화.
- INDEX `(startedAt)` — 시간 정렬.

**관계**: 1 ↔ 1 Cart, 1 ↔ N SessionParticipant, Order.

**라이프사이클**:
- 첫 스캔 (UC-1) — INSERT status=ACTIVE + Cart 동시 생성.
- 후속 스캔 — 동일 세션 합류 (신규 INSERT 안 함).
- 관리자 종료 (UC-4) — status=CLOSED + endedAt + cascade (orderCount>0이면 OrderHistory + Cart clear + SessionParticipant revoke; 빈 세션이면 history skip).
- QR 재발급 (UC-6) — UC-4 cascade 동일.

---

## 6. SessionParticipant

| 컬럼 | 타입 | 제약 | 비고 |
|------|------|------|------|
| id | TEXT (UUID) | PK | |
| sessionId | TEXT (UUID) | NOT NULL, FK → TableSession | non-null (v2.2) |
| token | TEXT (UUIDv4) | NOT NULL, UNIQUE | 본인 폰 X-Session-Token (CR-5) |
| joinedAt | DATETIME | NOT NULL DEFAULT now | |
| revokedAt | DATETIME | NULL | 세션 종료·QR 재발급 시 일괄 |

**인덱스**:
- UNIQUE `token` — 단일 토큰 1개 매핑.
- INDEX `(sessionId, revokedAt)` — 활성 참가자 조회.

**라이프사이클**:
- QR 스캔 시 INSERT (token 신규 발급).
- 같은 폰 재진입 시 (X-Session-Token 제출) 동일 행 재사용 (idempotent — TS-4 변형).
- 세션 종료·QR 재발급 시 UPDATE revokedAt=now.

---

## 7. Cart

| 컬럼 | 타입 | 제약 | 비고 |
|------|------|------|------|
| sessionId | TEXT (UUID) | PK & FK → TableSession | 1:1 매핑 (CT-1) |
| version | INTEGER | NOT NULL DEFAULT 0 | 단조 증가 (CR-6, CT-5) |
| updatedAt | DATETIME | NOT NULL | |

**라이프사이클**:
- 첫 스캔 시 INSERT (UC-1, version=0).
- 변경 시 UPDATE version += 1, updatedAt=now (`FOR UPDATE` lock).
- 종료 시 CartItem 일괄 DELETE, Cart row는 유지(또는 삭제 — 구현 선택).

---

## 8. CartItem

| 컬럼 | 타입 | 제약 | 비고 |
|------|------|------|------|
| cartSessionId | TEXT (UUID) | NOT NULL, FK → Cart | 복합 PK 일부 (CT-2) |
| menuId | TEXT (UUID) | NOT NULL, FK → Menu | 복합 PK 일부 |
| quantity | INTEGER | NOT NULL CHECK > 0 | CT-3: 0이면 자동 DELETE |
| addedAt | DATETIME | NOT NULL DEFAULT now | |

**PK**: 복합 `(cartSessionId, menuId)` — 동일 메뉴 재추가 시 UPSERT로 quantity 누적.

**인덱스**: INDEX `(cartSessionId, addedAt)`.

**라이프사이클**:
- POST `/cart/items` — UPSERT quantity 누적.
- PATCH — quantity 변경 (0이면 DELETE).
- DELETE — 단일 행.
- 카트 비우기·주문 확정·세션 종료 시 일괄 DELETE.

---

## 9. Order

| 컬럼 | 타입 | 제약 | 비고 |
|------|------|------|------|
| id | TEXT (UUID) | PK | |
| sessionId | TEXT (UUID) | NOT NULL, FK → TableSession | OD-1 활성 세션에만 |
| total | INTEGER | NOT NULL | OD-3 트랜잭션 내 계산, KRW |
| createdAt | DATETIME | NOT NULL DEFAULT now | |
| deletedAt | DATETIME | NULL | OD-5 soft-delete |

**인덱스**:
- INDEX `(sessionId, createdAt DESC)` — 시간 역순 조회 (US-C5.1).
- INDEX `(sessionId, deletedAt)` — 활성 주문 필터.

**라이프사이클**:
- 주문 확정 (UC-3) — INSERT + OrderItem cascade.
- 관리자 직권 삭제 (UC-7) — UPDATE deletedAt=now. 종료 세션 주문은 거부 (OD-4).
- 세션 종료 시 — 행 자체는 유지, OrderHistory.summary에 스냅샷 포함.

---

## 10. OrderItem

| 컬럼 | 타입 | 제약 | 비고 |
|------|------|------|------|
| id | TEXT (UUID) | PK | |
| orderId | TEXT (UUID) | NOT NULL, FK → Order | CASCADE |
| menuId | TEXT (UUID) | NOT NULL, FK → Menu | onDelete=NO ACTION (CR-4 보호) |
| menuNameSnapshot | TEXT | NOT NULL | OD-2 |
| unitPriceSnapshot | INTEGER | NOT NULL | OD-2 |
| quantity | INTEGER | NOT NULL CHECK > 0 | |

**인덱스**: INDEX `(orderId)`.

**라이프사이클**:
- UC-3 INSERT (스냅샷 복사).
- Menu 변경·삭제 시 영향 없음 (CR-4).

---

## 11. OrderHistory

| 컬럼 | 타입 | 제약 | 비고 |
|------|------|------|------|
| id | TEXT (UUID) | PK | |
| tableId | TEXT (UUID) | NOT NULL, FK → Table | |
| originalSessionId | TEXT (UUID) | NOT NULL | 종료된 TableSession.id (FK 안 걸어도 됨) |
| closedAt | DATETIME | NOT NULL | TS-5 |
| summary | TEXT (JSON) | NOT NULL | `{ orders: [{ id, total, items: [{ menuNameSnapshot, unitPriceSnapshot, quantity }] }], total }` |

**인덱스**: INDEX `(tableId, closedAt DESC)` — US-A3.4 날짜 필터.

**라이프사이클**:
- UC-4·UC-6 종료 시 orderCount>0인 경우만 INSERT (v2.2).
- 빈 세션은 미기록 (TS-5).
- 직접 변경 불가 (OD-6 read-only).

---

## 12. Menu

| 컬럼 | 타입 | 제약 | 비고 |
|------|------|------|------|
| id | TEXT (UUID) | PK | |
| storeId | TEXT (UUID) | NOT NULL, FK → Store | CR-1 |
| categoryId | TEXT (UUID) | NOT NULL, FK → MenuCategory | |
| name | TEXT | NOT NULL | |
| price | INTEGER | NOT NULL CHECK > 0 | MN-1 |
| description | TEXT | NULL | |
| imageUrl | TEXT | NULL | |
| sortOrder | INTEGER | NOT NULL DEFAULT 0 | MN-5 |
| soldout | BOOLEAN | NOT NULL DEFAULT 0 | MN-2 |
| deletedAt | DATETIME | NULL | MN-4 soft-delete |
| createdAt | DATETIME | NOT NULL DEFAULT now | |

**인덱스**:
- INDEX `(storeId, categoryId, sortOrder)` — 고객 메뉴 화면 정렬.
- INDEX `(storeId, deletedAt)` — 활성 메뉴 필터.

**라이프사이클**:
- 관리자 등록·수정·정렬·품절 토글·삭제.
- 삭제 시 카트 충돌 검사 (MN-4 → MENU_IN_CART) 후 soft-delete.
- 수정 시 soldout 보존 (MN-3).

---

## 13. MenuCategory

| 컬럼 | 타입 | 제약 | 비고 |
|------|------|------|------|
| id | TEXT (UUID) | PK | |
| storeId | TEXT (UUID) | NOT NULL, FK → Store | CR-1 |
| name | TEXT | NOT NULL | "음료" 등 |
| sortOrder | INTEGER | NOT NULL DEFAULT 0 | |

**인덱스**: INDEX `(storeId, sortOrder)`.

**라이프사이클**: 시드로 생성. MVP는 카테고리 CRUD 미포함 (메뉴 관리에서 분리하지 않음).

---

## 14. Advertisement

| 컬럼 | 타입 | 제약 | 비고 |
|------|------|------|------|
| id | TEXT (UUID) | PK | |
| slot | TEXT | NOT NULL CHECK IN ('menu_top','menu_bottom','cart_bottom') | AD-2 |
| imageUrl | TEXT | NOT NULL | |
| clickUrl | TEXT | NOT NULL | 외부 URL |
| active | BOOLEAN | NOT NULL DEFAULT 1 | AD-1 |
| createdAt | DATETIME | NOT NULL DEFAULT now | |

**인덱스**: INDEX `(slot, active)`.

**라이프사이클**: 시드로만 등록 (CR-7). 관리자 CRUD 없음.

---

## 15. 외래키 cascade 정책 요약

| FK | onDelete | 이유 |
|----|----------|------|
| StoreUser.storeId | CASCADE | 매장 삭제 시 동반 (MVP는 매장 삭제 없음) |
| Table.storeId | CASCADE | 동상 |
| TableSession.tableId | RESTRICT | 종료된 history 보존 |
| SessionParticipant.sessionId | CASCADE | 세션과 동반 |
| Cart.sessionId | CASCADE | 동상 |
| CartItem.cartSessionId | CASCADE | Cart 일괄 삭제 시 |
| CartItem.menuId | RESTRICT | MN-4 — 카트 포함 메뉴는 삭제 차단 |
| Order.sessionId | RESTRICT | 무결성 보호 |
| OrderItem.orderId | CASCADE | Order soft-delete 시 자동 X (deletedAt 처리) |
| OrderItem.menuId | NO ACTION | CR-4 스냅샷 보호 |
| OrderHistory.tableId | RESTRICT | |
| Menu.storeId | CASCADE | |
| Menu.categoryId | RESTRICT | 카테고리 삭제 차단 |
| MenuCategory.storeId | CASCADE | |

> **참고**: 실제 SQLite에서는 외래키 강제가 PRAGMA로 활성화돼야 한다 (`PRAGMA foreign_keys = ON`). TypeORM `synchronize: true` 옵션 또는 마이그레이션 스크립트에서 보장.

---

## 16. 마이그레이션 / 시드 적재 순서

```text
1. Store
2. StoreUser
3. MenuCategory
4. Menu
5. Table
6. Advertisement
(TableSession·Participant·Cart·CartItem·Order·OrderItem·OrderHistory는 런타임 생성)
```

TypeORM `migration:generate`로 초기 1회 생성, `seed.service.ts`가 onModuleInit에서 idempotent INSERT.

---

## 17. 엔티티 ↔ 룰 ↔ Use-case 요약

| Entity | 핵심 룰 | 주요 use-case |
|--------|---------|----------------|
| Store | TS-6 | UC-1 (영업 종료 차단) |
| StoreUser | AU-1, AU-3, CR-5 | AuthService.login |
| Table | TS-1, CR-5 | UC-6 (qrToken UPDATE) |
| TableSession | TS-2, TS-3, TS-5, CR-2 | UC-1, UC-4, UC-6 |
| SessionParticipant | TS-4, CR-5 | UC-1, UC-4, UC-6 (revoke) |
| Cart | CT-1, CT-5, CR-6 | UC-1 (생성), UC-2, UC-3 (clear) |
| CartItem | CT-2, CT-3, CT-4 | UC-2, UC-3 |
| Order | OD-1, OD-3, OD-4, OD-5 | UC-3, UC-7 |
| OrderItem | OD-2, CR-4 | UC-3 |
| OrderHistory | OD-6, TS-5 | UC-4 (orderCount>0), UC-6 |
| Menu | MN-1~5, CR-4 | UC-5, UC-8 |
| MenuCategory | (시드 only) | seed |
| Advertisement | AD-1~4, CR-7 | AdsService.listActive |
