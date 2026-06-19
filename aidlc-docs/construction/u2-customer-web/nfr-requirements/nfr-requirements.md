# U2 Customer Web — NFR Requirements (v2.2)

> **Stage**: CONSTRUCTION · U2 · NFR Requirements Step 6 산출물 (1/2)

---

## 1. NFR 매핑 (requirements.md v2 ↔ U2)

| NFR | U2 적용 메커니즘 |
|-----|------------------|
| NFR-1 SSE ≤2초 | `useSseChannel` 훅이 `EventSource` 자동 처리, `setQueryData`로 즉시 화면 갱신 |
| NFR-4 모바일 a11y | rem 단위 + CSS 변수 `--font-scale` + `useAccessibility` 토글 + 시스템 폰트 자동 반영 |
| NFR-5 localStorage 정책 | sessionToken·sessionId·storeMeta + a11y/help 플래그만. 카트·주문은 서버 권한. |
| NFR-6 SSE 전송 | EventSource 기본 자동 재연결 + reconcile fetch |
| NFR-8 Local-only | Vite dev 서버 5173, backend localhost:3000 호출 |
| NFR-10 Testability | Vitest + RTL + MSW로 핵심 시나리오 회귀 |
| NFR-11 반응형/BYOD | 320~480px 우선 + PWA manifest + service worker (vite-plugin-pwa) |
| NFR-12 동시성 | last-write-wins는 서버 처리, U2는 SSE setQueryData로 화면 일관성만 보장 |

## 2. Scalability / Availability

- 워크샵 PoC + 로컬 단일 머신. 동시 사용자 = 같은 테이블 일행 N명(2~5명 예상).
- 가용성: 클라이언트 측 자동 복구는 EventSource 기본 재연결 + reconcile fetch만.

## 3. Performance

| 항목 | 목표 |
|------|------|
| 초기 로드 (vite dev, 캐시 없음) | ≤ 1.5s |
| 라우트 전환 | ≤ 100ms |
| SSE 이벤트 → 화면 갱신 | ≤ 100ms (브라우저 내부) |
| 메뉴 카드 렌더 (12개) | ≤ 50ms |

## 4. Security

- HTTPS 미적용 (로컬 PoC). production 전환 시 추가.
- `X-Session-Token` 헤더로만 전송, URL·쿼리에 노출 X.
- Bearer 토큰 사용 X (관리자 영역 아님).
- 외부 광고 URL: `target="_blank"` + `rel="noopener noreferrer"`.

## 5. Reliability

- 4xx/5xx 통합 핸들링 (errorCode → 토스트 메시지 매핑)
- 401 → 세션 폐기 + 안내 화면
- EventSource 끊김 → 자동 재연결 + `onopen`에서 reconcile fetch (CL-8)
- 새로고침: TanStack Query가 mount 시 자동 fetch + 캐시 복원

## 6. Maintainability

- TypeScript strict + shared 패키지 import (DTO 타입 안전)
- ESLint + Prettier (vite-plugin-react 기본)
- `data-testid` 부착으로 테스트 안정성 (CL-5)
- 단일 책임 컴포넌트 (Container vs Presentation 분리)

## 7. Usability (핵심 — 고객용)

- 모바일 폼팩터 우선 (320~480px)
- 시스템 폰트 자동 따라가기 (rem)
- 큰 글자 모드 + 고대비 모드 토글 (NFR-4, P4 보조)
- 도움말 자동 노출 + 헬프 버튼 항시 노출 (US-C0.1)
- 주문 확정 직전 강화 확인 (P4)
- 토스트 정보·에러 구분 + a11y 적용
