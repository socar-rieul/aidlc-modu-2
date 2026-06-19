# U3 Admin Web — NFR Requirements (v2.2)

> **Stage**: CONSTRUCTION · U3 · NFR Requirements Step 6 산출물 (1/2)

---

## 1. NFR 매핑

| NFR | U3 적용 |
|-----|---------|
| NFR-1 SSE ≤2초 | `useStoreSseChannel` + invalidateQueries로 그리드 즉시 갱신 |
| NFR-2 JWT 30일 | expiresAt localStorage 비교 + mount 시 만료 처리 |
| NFR-3 보안 | 비밀번호 평문 메모리 X, 401 → 즉시 폐기 |
| NFR-6 SSE 전송 | EventSource 자동 재연결 |
| NFR-8 Local-only | proxy → backend:3000 |
| NFR-10 Testability | Vitest + RTL + 모킹 가능 (TanStack Query) |

## 2. Scalability

- 시드 1 매장 + 5 테이블 + 12 메뉴 수준. 데스크톱 그리드 N=5 정도라 가벼움.

## 3. Performance

| 항목 | 목표 |
|------|------|
| 초기 로드 | ≤ 1.5s |
| 라우트 전환 | ≤ 100ms |
| SSE 이벤트 → 그리드 갱신 | ≤ 1초 (≤2초 SLO 안) |
| QR 다운로드 | ≤ 2초 |

## 4. Security

- HTTPS 미적용 (로컬 PoC). production은 별도.
- Authorization 헤더만 사용. URL/쿼리 토큰 X.
- 외부 광고 클릭 X (관리자 화면엔 광고 없음).

## 5. Reliability

- 4xx/5xx 통합 핸들링
- 401 → JWT 폐기 + `/login`
- mutation 실패 시 캐시 invalidate 없이 토스트만

## 6. Maintainability

- TypeScript strict + shared DTO 재사용
- ESLint + Prettier
- data-testid 부착 (AL-9)

## 7. Usability (관리자)

- 데스크톱 우선 (≥ 768px)
- 위험 액션 ConfirmDialog 필수
- 신규 주문 강조 애니메이션
