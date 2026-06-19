# AI-DLC State Tracking

## Project Information
- **Project Name**: 테이블오더 서비스 (Table Order Service)
- **Project Type**: Greenfield
- **Start Date**: 2026-06-19T01:41:25Z
- **Current Stage**: INCEPTION - **User Stories Iteration 3 v2.1 정리 완료** — 사용자 요청으로 US-C1.2/A2.4/A2.5 제거, US-C4.1 흐름 수정(주문번호 X → 주문내역 화면 이동), 신규 US-A4.4 메뉴 품절 토글 + Menu.soldout 컬럼 + US-C2.1/C3.1 AC 보강 + requirements.md FR-A2 단순화 + FR-A4 확장 + Out of Scope 보강. P2 페르소나 v1 잔재 "신규 태블릿 초기 설정" 제거. 총 27→25 스토리. Approval Gate 유지.

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
- [x] User Stories Iteration 3 (v2 — 4 페르소나 BYOD 갱신 + 27 스토리, CR-1~CR-7). v1(23 스토리)은 git tag `v1-shared-tablet`에 보존, 사용자 승인 대기.
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
