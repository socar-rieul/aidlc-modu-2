# AI-DLC State Tracking

## Project Information
- **Project Name**: 테이블오더 서비스 (Table Order Service)
- **Project Type**: Greenfield
- **Start Date**: 2026-06-19T01:41:25Z
- **Current Stage**: INCEPTION - **Workflow Planning Step 9 — Approval Gate 대기**. User Stories v2.1 (25 스토리, 4 페르소나, BYOD/QR) 사용자 명시 승인 완료. execution-plan.md 작성 — App Design/Units Generation EXECUTE, Functional Design/NFR Req/NFR Design EXECUTE per-unit, Infrastructure Design SKIP(로컬 한정), Code Gen/Build & Test EXECUTE, Operations PLACEHOLDER. 권장 3 유닛 (U1 Backend / U2 Customer PWA / U3 Admin SPA).

## Version Markers
- **v1 (deprecated, 보존됨)**: 공용 태블릿 모델 — git tag `v1-shared-tablet` (commit 4064878)
- **v2 (current)**: BYOD + QR 모델 — 진행 중

## Workspace State
- **Existing Code**: No
- **Programming Languages**: TypeScript — 백엔드 Node.js + NestJS / 프론트엔드 React (자바 제외)
- **Build System**: npm (NestJS + React), 데이터 저장소 SQLite
- **Project Structure**: Empty (Greenfield)
- **Reverse Engineering Needed**: No
- **Workspace Root**: /Users/isco/ai/work/projects/AWS_AI_DLC/aidlc-modu

## Code Location Rules
- **Application Code**: Workspace root (NEVER in aidlc-docs/)
- **Documentation**: aidlc-docs/ only
- **Structure patterns**: See code-generation.md Critical Rules

## User-Stated Constraints (이전 대화 + prompt.md)
- 실제 배포 없음 — 로컬 실행/확인만
- 보안(Security) extension 오늘 패스
- Property-Based Testing extension 오늘 패스
- 구현 언어에서 Java 제외 (코드 길어짐 회피)
- AI-DLC 워크플로우/질문을 최대한 충실히 따름

## Extension Configuration
| Extension | Enabled | Decided At |
|---|---|---|
| Security Baseline | No (Q7) | Requirements Analysis |
| Property-Based Testing | No (Q8) | Requirements Analysis |
| Resiliency Baseline | No (Q9) | Requirements Analysis |

## Stage Progress
### 🔵 INCEPTION PHASE
- [x] Workspace Detection
- [ ] Reverse Engineering (N/A — Greenfield)
- [x] Requirements Analysis (v1 9문항 + v2 5문항 종합, requirements.md v2 BYOD/QR/공동 장바구니/광고)
- [x] User Stories Iteration 3 v2.1 (BYOD 4 페르소나 + 25 스토리, CR-1~CR-7). v1(23 스토리)은 git tag `v1-shared-tablet`에 보존. 2026-06-19 사용자 명시 승인.
- [x] Workflow Planning (execution-plan.md 작성 완료) — Step 9 Approval Gate 대기
- [ ] Application Design — EXECUTE
- [ ] Units Generation — EXECUTE (권장 3 유닛: U1 Backend / U2 Customer PWA / U3 Admin SPA)

### 🟢 CONSTRUCTION PHASE
- [ ] Functional Design (per-unit) — EXECUTE
- [ ] NFR Requirements (per-unit) — EXECUTE
- [ ] NFR Design (per-unit) — EXECUTE
- [ ] Infrastructure Design (per-unit) — SKIP (로컬 한정 / NFR-8)
- [ ] Code Generation (per-unit) — EXECUTE
- [ ] Build and Test — EXECUTE

### 🟡 OPERATIONS PHASE
- [ ] Operations (PLACEHOLDER — 배포 없음으로 생략 예정)
