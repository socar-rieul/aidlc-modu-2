# AI-DLC State Tracking

## Project Information
- **Project Name**: 테이블오더 서비스 (Table Order Service)
- **Project Type**: Greenfield
- **Start Date**: 2026-06-19T01:41:25Z
- **Current Stage**: INCEPTION - **Requirements Analysis Iteration 2 (BYOD/QR + 광고) 완료** — requirements.md v2 + constraints.md 갱신 + 5문항 답변 완료. 사용자 승인 대기 (Approval Gate). 다음 = User Stories Iteration 3 재작성.

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
- [x] Requirements Analysis (v1 — 9문항 답변 + requirements.md + 관리자 세션 30일 반영). **Iteration 2 진행 중 (v2 BYOD/QR)** — 신규 clarifying questions 5문항 답변 대기.
- [x] User Stories (v1 — 4 페르소나 + 23 스토리, v1-shared-tablet 태그에 보존). v2 재작성은 Requirements Iteration 2 완료 후 진행.
- [ ] Workflow Planning
- [ ] Application Design
- [ ] Units Generation

### 🟢 CONSTRUCTION PHASE
- [ ] Functional Design (per-unit)
- [ ] NFR Requirements (per-unit)
- [ ] NFR Design (per-unit)
- [ ] Infrastructure Design (per-unit)
- [ ] Code Generation (per-unit)
- [ ] Build and Test

### 🟡 OPERATIONS PHASE
- [ ] Operations (PLACEHOLDER — 배포 없음으로 생략 예정)
