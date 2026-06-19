# Performance Test Instructions

## Purpose

워크샵 PoC라 **정식 부하 테스트는 실시하지 않는다**. 단, NFR Requirements에서 정의한 SLO/SLI를 기록·관측 가능한 형태로 정리해 후속 production 전환 시 기준선으로 사용한다.

## Performance Requirements (NFR Requirements 결정)

### Backend (U1)
| 항목 | 목표 |
|------|------|
| REST API 평균 응답 | ≤ 200ms |
| REST API p95 응답 | ≤ 500ms |
| SSE 트랜잭션 commit → 클라이언트 수신 | ≤ 2초 (NFR-1) |
| 시드 적재 cold start | ≤ 5초 |
| NestJS 부트스트랩 | ≤ 3초 |
| 로그인 brute force 차단 | 5회 실패 → 5분 lock |

### Customer Web (U2)
| 항목 | 목표 |
|------|------|
| 초기 로드 (vite dev) | ≤ 1.5s |
| 라우트 전환 | ≤ 100ms |
| SSE 이벤트 → 화면 갱신 | ≤ 100ms (브라우저 내부) |
| 메뉴 카드 12개 렌더 | ≤ 50ms |

### Admin Web (U3)
| 항목 | 목표 |
|------|------|
| 초기 로드 | ≤ 1.5s |
| 라우트 전환 | ≤ 100ms |
| SSE 이벤트 → 그리드 갱신 | ≤ 1초 |
| QR 다운로드 | ≤ 2초 |

## 동시 사용자 상정 (PoC)

- 매장 1, 활성 테이블 5
- 테이블당 BYOD 참가자 2~5명 (동시 카트 변경 시나리오)
- 매장 관리자 1명 (대시보드 + 매장 채널 SSE)
- **합계 동시 사용자**: 약 10~30명 (워크샵 시연 범위)

## 수동 관측 방법

### Backend 응답 시간 (LoggingInterceptor)

backend dev 콘솔 로그에 `${method} ${url} ${ms}ms` 형식 출력. 워크샵 시연 중 콘솔 캡쳐로 평균 응답 시간 관측 가능.

```bash
pnpm --filter @table-order/backend dev | tee backend.log
# 별도 터미널
grep -oE '[0-9]+ms' backend.log | awk '{s+=$1; n++} END {print "avg=" s/n "ms over " n " req"}'
```

### Frontend Lighthouse / Web Vitals

```bash
# Customer Web production build 후 preview
pnpm --filter @table-order/customer-web build
pnpm --filter @table-order/customer-web preview
# Chrome DevTools → Lighthouse → Mobile + Performance 측정
```

### SSE latency 측정

수동 시나리오:
1. 브라우저 A(고객 폰) DevTools Network → EventSource 탭 활성
2. 브라우저 B(다른 폰)에서 카트 메뉴 1개 추가
3. 브라우저 A에 `cart.updated` 이벤트가 표시되는 시각 - 백엔드 로그의 SSE emit 시각 = latency
4. 워크샵 환경에서 보통 10~100ms (NFR-1 ≤2초 SLO 대비 충분히 빠름)

## 정식 부하 테스트 (Out of Scope, 후속)

본 PoC 범위 밖이나, 운영 환경 전환 시 다음을 권장:
- **k6** 또는 **autocannon** — Backend REST 부하
- 가상 사용자 50~100명 × 5분 ramp-up
- 시나리오: QR 스캔 → 카트 추가 (3회) → 주문 확정 → 종료
- 측정: p50/p95/p99 응답 시간, 에러율, throughput

## Performance Optimization (필요 시)

PoC 한정 가벼운 최적화는 다음을 고려:
- TypeORM `cache: true` (read-heavy 메뉴 조회)
- SSE Subject buffer size 제한 (메모리 누수 방지)
- Vite production build의 chunk splitting (현재 단일 chunk 220/227KB이지만 작아서 OK)
- React Query staleTime 길게 (메뉴는 30s → 60s)

운영 환경에서는 Redis 캐시·PostgreSQL 마이그레이션·CDN(정적 자산)·load balancer 등 별도 단계.

## Status

| 항목 | 상태 |
|------|------|
| SLO 정의 | ✅ |
| 자동 부하 테스트 | ❌ (PoC 미실시) |
| 수동 관측 가이드 | ✅ |
| 시연 영상/스크린샷 | (워크샵 진행 시 캡쳐) |
