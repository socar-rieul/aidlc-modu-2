# Operations Phase — PLACEHOLDER

## Status

본 워크플로우에서는 Operations 단계를 **PLACEHOLDER**로 둔다. 사용자 사전 결정 — Requirements Analysis Q6 "로컬만 실행" + NFR-8 "Local-only" + execution-plan §3 "Infrastructure Design SKIP / Operations PLACEHOLDER".

## Current State

- 모든 build / unit test / integration test (e2e) 활동은 **CONSTRUCTION Phase의 Build and Test 단계에서 완료**됨
- 실제 배포·운영 없음 (워크샵 PoC)
- 로컬 단일 머신에서 `pnpm dev` 한 줄로 동작 가능

## Future Expansion (참고)

향후 production 전환 시 본 단계는 다음을 포함하게 된다:

- **Deployment** — Cloud Run/EKS/Vercel/Cloudflare 등 배포 자동화 + IaC (Terraform/Pulumi)
- **Monitoring & Observability** — APM (Datadog/New Relic) · 로그 수집 (Cloudwatch/Loki) · 메트릭 (Prometheus/Grafana) · 추적 (OpenTelemetry)
- **Incident Response** — On-call 정책 · 알림 채널 · runbook · 사후 분석
- **Maintenance** — 백업 · 마이그레이션 · 디펜던시 업데이트 · 보안 패치 · 데이터 보존 정책
- **Production Readiness Checklist** — Security 강화 (Helmet/Rate Limit/HTTPS) · Resiliency (Circuit Breaker/Retry/Fallback) · Scalability (Redis 캐시/Postgres/Load Balancer/CDN) · Data Isolation (multi-tenant 강화) · Audit Log 영속화

## 핵심 운영 결정 후보 (production 전환 시)

- SQLite → PostgreSQL 마이그레이션 (TypeORM 그대로 사용 가능)
- in-memory SSE Subject → Redis Pub/Sub (수평 확장 시)
- Vite dev → 정적 호스팅(CDN) + production NestJS API 분리 배포
- JWT secret → KMS/Secret Manager
- bcrypt rounds 10 → 12 (production)

## 본 사이클 종료 신호

✅ AI-DLC 워크플로우(INCEPTION + CONSTRUCTION + Build and Test) **완료**.
워크샵 PoC 산출물은 코드(`packages/`) + 문서(`aidlc-docs/`) 모두 검증 통과 상태로 보존됨.
