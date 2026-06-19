# Integration Test Instructions

## Purpose

3 유닛(U1 Backend / U2 Customer Web / U3 Admin Web)의 상호작용을 검증한다.

## 자동 통합 테스트 — Backend e2e (Supertest)

위치: `packages/backend/test/qr-cart-order.e2e-spec.ts`

```bash
cd packages/backend && npx jest --config test/jest-e2e.json --runInBand
```

**Expected**: 4/4 PASS

| 시나리오 | 검증 use-case |
|----------|---------------|
| 정상 흐름 (QR 스캔 → 메뉴 → 카트 추가 → 주문 확정 → 카트 비움 + 주문 내역) | UC-1 / UC-2 / UC-3 (CR-3·CR-4·CR-6) |
| 빈 카트 주문 확정 거부 (400 + `CART_EMPTY`) | UC-3 사전 검증 |
| 관리자 로그인 → 대시보드 조회 | AuthService + AdminDashboardService |
| 5회 실패 → 6번째 400 + `LOGIN_RATE_LIMITED` | AU-1 |

### 환경
- **DB**: `process.env.DB_PATH = ':memory:'` (in-memory SQLite — 격리)
- **JWT_SECRET**: 테스트용 고정
- **Cleanup**: 각 spec 후 NestJS `app.close()` + 다음 spec에서 `:memory:` 재생성

## 수동 통합 검증 — 풀 e2e 시나리오 (3 유닛)

### Scenario A — 손님 풀 흐름 (U1 + U2)

#### Setup
```bash
# 터미널 1
pnpm --filter @table-order/backend dev   # :3000
# 터미널 2
pnpm --filter @table-order/customer-web dev   # :5173
```

#### Steps
1. backend 시드의 데모 매장 테이블 qrToken 1개 확인 — `sqlite3 packages/backend/data/app.sqlite "SELECT id,number,qrToken FROM tables LIMIT 5;"`
2. 브라우저 A: `http://localhost:5173/qr/{qrToken}` → 자동 `/menu` 진입
3. 메뉴 카드 "담기" 1회 → 토스트 + BottomBar 갱신
4. 같은 qrToken을 브라우저 B (별도 시크릿 창)에서도 진입 → 둘이 같은 세션 합류
5. 브라우저 A에서 메뉴 추가 → 브라우저 B 카트 화면이 ≤2초 안에 자동 갱신 ✅ (NFR-1)
6. 브라우저 A "장바구니" → "주문 확정" → "주문하기" → `/orders` 이동
7. 브라우저 B `/orders` 자동 갱신 (같은 SSE 채널) ✅
8. 브라우저 A 큰 글자/고대비 토글 → 폰트 1.5배 + 검정 배경

### Scenario B — 관리자 흐름 (U1 + U3)

#### Setup
```bash
# 터미널 3
pnpm --filter @table-order/admin-web dev   # :5174
```

#### Steps
1. `http://localhost:5174/login` → 시드 계정으로 로그인 (owner / demo1234)
2. `/` 대시보드 → 5 테이블 카드 노출
3. Scenario A에서 진행 중인 테이블 카드에 주문 + 총액 표시 ✅
4. 신규 주문 발생 시 카드 강조 + 토스트 "신규 주문!" ≤2초 ✅
5. `/menus` 메뉴 "아메리카노" soldout 토글 → SSE 매장 채널 + 세션 채널 fan-out
6. 동시 브라우저 A(고객)에서 메뉴 화면 새로고침 시 "품절" 배지 노출 ✅
7. `/tables` 새 테이블 6번 추가 → QR PNG 다운로드 → 파일 다운로드 ✅
8. 진행 중인 테이블 카드 "이용 완료" 클릭 → 확인 → 손님 폰 B에서 "이용이 종료되었습니다." 안내 노출 + 자동 `/error/session-ended`
9. `/history`에서 테이블 선택 → 종료된 세션이 시간 역순 노출 ✅

### Scenario C — 메뉴 삭제 카트 충돌 (US-A4.2 v2.2)

1. 브라우저 A(고객)에서 메뉴 1개 카트에 담음
2. 관리자 `/menus`에서 해당 메뉴 삭제 시도
3. 응답 400 + `MENU_IN_CART` → 관리자 토스트 "이 메뉴는 손님 카트에 담겨 있어요…" ✅
4. 브라우저 A에서 카트 비우기
5. 관리자 다시 삭제 시도 → 성공 ✅

### Scenario D — QR 재발급 cascade (US-A3.1)

1. 브라우저 A 활성 세션 + 카트에 메뉴 있음
2. 관리자 `/tables` → "QR 재발급" → 확인
3. 손님 폰 A → `session.closed { reason: 'qr-revoked' }` 수신 → `/error/session-ended` ✅
4. 관리자 `/tables`에서 새 QR PNG 다운로드 → 다시 부착

## Cleanup

- `pkill -f "nest start"` (backend) / `pkill -f "vite"` (frontend)
- SQLite 파일은 다음 워크샵을 위해 유지하거나 `rm packages/backend/data/app.sqlite` 후 재시드

## 통합 검증 결과 (검증 시점)

- Backend e2e: **4/4 PASS** (2026-06-19 검증)
- 수동 Scenario A·B·C·D: 본 인스트럭션에 따라 워크샵 진행 중 검증
