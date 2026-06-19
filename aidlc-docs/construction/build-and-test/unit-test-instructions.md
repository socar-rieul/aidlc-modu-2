# Unit Test Execution

## 1. 전체 단위 테스트 실행

```bash
pnpm test
```

각 패키지의 `test` 스크립트가 순서대로 실행된다.

- `@table-order/shared` → "no tests for shared" (의도)
- `@table-order/backend` → Jest (단위 spec)
- `@table-order/customer-web` → Vitest
- `@table-order/admin-web` → Vitest

## 2. 패키지별 실행

### Backend (Jest 단위 — 옵션)

```bash
pnpm --filter @table-order/backend test
```

> **참고**: 본 워크샵 PoC에서는 도메인 service mock 단위 테스트보다 **e2e가 핵심 검증**. 단위 spec은 일부 도메인만 작성됐을 수 있음 (필요 시 추가 가능). 핵심 시나리오는 [`integration-test-instructions.md`](integration-test-instructions.md) 참조.

### Customer Web (Vitest)

```bash
pnpm --filter @table-order/customer-web test
```

**Expected**: `Tests 1 passed (1)` — `useAccessibility.test.tsx`

| 시나리오 | 검증 |
|----------|------|
| 큰 글자 토글 → html classList + localStorage 영속 | ✅ |

### Admin Web (Vitest)

```bash
pnpm --filter @table-order/admin-web test
```

**Expected**: `Tests 4 passed (4)` — `useAdminAuth.test.ts`

| 시나리오 | 검증 |
|----------|------|
| setAuth → getJwt 가 토큰 반환 | ✅ |
| 만료 후엔 getJwt가 null + 자동 폐기 | ✅ |
| clearAuth로 양쪽 키 모두 폐기 | ✅ |
| decodeStoreId payload base64 디코드 | ✅ |

## 3. 테스트 결과 위치

- 콘솔 출력 위주 (워크샵 PoC라 별도 reporter 미설정)
- 커버리지 보고서: `--coverage` 옵션 추가 시 `coverage/` 폴더 생성
- e2e 보고서: 콘솔 + `packages/backend/test/jest-e2e.json`

## 4. 실패 시 대응

1. 콘솔 출력에서 실패 spec 식별
2. 해당 파일의 `it()` 블록과 service/component 코드 비교
3. 수정 → 동일 명령 재실행

### 알려진 이슈

- **Node 25 + jsdom 25**: `localStorage.getItem is not a function` → `test-setup.ts`의 인메모리 polyfill 적용 확인 (이미 적용됨)
- **Backend Jest config + `@table-order/shared` import**: `jest.config.js`의 `moduleNameMapper`로 path mapping 해결됨

## 5. 커버리지 목표 (NFR Requirements 결정)

- **커버리지 강제 없음** (Q2 결정)
- 핵심 use-case 시나리오 위주 검증

## 6. 단위 테스트 ↔ 스토리 traceability

| 단위 테스트 | 스토리 |
|-------------|--------|
| `useAccessibility.test.tsx` | US-C0.2 |
| `useAdminAuth.test.ts` | US-A1.2 (만료 자동 폐기), US-A1.1 (JWT 발급 store) |
| (Backend unit) | 부분 — 핵심 검증은 e2e |
