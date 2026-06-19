# AI-DLC Audit Log

전체 사용자 입력과 AI 응답을 시간순으로 기록한다 (ISO 8601 UTC).

---

## 🔖 ROLLBACK MARKER — v1 (공용 태블릿) → v2 (BYOD/QR) 전환

**Decided At**: 2026-06-19T11:55:00Z
**User Input (raw)**:
> "지금 우리 테이블에 테블릿 화면이 설치되는 형태로 기획이 된건가? 그런데 우리는 QR 로 각자 메뉴를 확인하고 각자 모바일 디바이스에서 메뉴를 확인할 수도 있고 각자 주문을 넣을 수도 있는 형태로 변경하고 싶은데, 이렇게 변경하려고 하면 워크플로우 어느 단계를 수정하거나 다시 해봐야할까?"
> 이어서 "그럼 거기로 돌아가자." + "혹시 다시 지금까지 했던 것으로 돌아올 수도 있는데, 이것도 다 기록이 되나?" → 옵션 A 선택.

### v1 모델 (deprecated, 보존됨)
- **Persona/Touchpoint**: 매장 테이블에 비치된 **공용 태블릿** 1대를 모든 손님이 공유
- **인증**: 관리자가 1회 매장ID·테이블번호·테이블비번 입력 → localStorage 저장 → 손님은 자동 로그인
- **세션**: 한 테이블 = 한 디바이스 = 한 세션 흐름
- 마지막 산출물: Requirements Analysis 완료 + User Stories 23개(4 페르소나) 승인 대기 상태

### v2 모델 (현재 진행)
- **Persona/Touchpoint**: 손님 각자의 **본인 모바일 디바이스(BYOD)** + 테이블별 **QR 코드**
- **인증**: 손님이 QR 스캔 → 임시 토큰 발급 → 본인 폰 세션 생성
- **세션**: 한 테이블 = 한 테이블 세션 + N개 참가자(디바이스) 합류 가능
- 시작 단계: Requirements Analysis **Iteration 2** — clarifying questions 5문항 재수집

### 롤백 방법
- **v1 산출물 조회**: `git show v1-shared-tablet:aidlc-docs/inception/requirements/requirements.md` 등
- **v1 시점 비교**: `git diff v1-shared-tablet..HEAD`
- **v1로 완전 복귀**: `git checkout v1-shared-tablet` (브랜치 분기 권장)
- **태그 위치**: commit `4064878` (User Stories Iteration 2 — P4 페르소나 보강 직후)

---

## Workflow Start — Initial Request
**Timestamp**: 2026-06-19T01:41:25Z
**User Input**: "prompt.md 로 시작하자."
**Referenced prompt.md**: "테이블오더 서비스를 구축하고 싶습니다. 다음 파일들에서 요구사항을 읽어주세요: requirements/table-order-requirements.md, requirements/constraints.md. AI-DLC 워크플로우를 시작해봅시다."
**User-stated constraints (이전 대화에서 전달, raw)**: "실제 배포는 안할거고 로컬에서만 확인할 거야. (보안 관련도 오늘은 패스, property 베이스 테스트도 오늘 워크샵에서는 패스) 웬만하면 코드는 자바는 사용하지 말래. 길어질 것이라서. ai dlc 가 새 서비스를 바이브코딩으로 만들 때 따르면 좋은 워크플로우 및 서비스를 날카롭게 만드는 질문들이 있는데, 최대한 그걸 따라가보자."
**AI Response**: AI-DLC 워크플로우 시작. Welcome message 표시 → Workspace Detection 실행.
**Context**: INCEPTION Phase 진입.

---

## Workspace Detection
**Timestamp**: 2026-06-19T01:41:25Z
**AI Response**: aidlc-docs/aidlc-state.md 부재 확인(신규 프로젝트). 워크스페이스(aidlc-modu/) 소스코드 스캔 결과 소스코드 파일 0개 → Greenfield 판정. aidlc-state.md 생성. Reverse Engineering 생략(greenfield). Requirements Analysis로 자동 진행.
**Context**: INCEPTION - Workspace Detection 완료. brownfield=false.

---

## Requirements Analysis — Clarifying Questions 생성
**Timestamp**: 2026-06-19T01:41:25Z
**AI Response**: requirements/table-order-requirements.md + constraints.md 분석(Intent: New Project / Scope: System-wide / Complexity: Moderate~Complex). 완성도 분석 후 aidlc-docs/inception/requirements/requirement-verification-questions.md 생성(8문항: 기술스택 4 + extension opt-in 3 + 데이터 저장 등). 사용자가 이전 대화에서 명시한 제약(로컬 한정·보안 패스·PBT 패스·자바 금지)은 해당 질문에 미리 답을 채워 확인 요청. GATE: 사용자 답변 대기 중.
**Context**: INCEPTION - Requirements Analysis Step 6. 사용자 답변 대기.

---

## Requirements Analysis — Clarifying Questions 답변 수집
**Timestamp**: 2026-06-19T01:41:25Z
**User Input (선택형 UI 응답, raw)**: "Q1=다중 매장 / Q2=Node.js + NestJS / Q3=React / Q4=SQLite / Q5=localStorage / Q6=로컬만 실행 / Q7=No(보안 패스) / Q8=No(PBT 패스) / Q9=No(복원력 baseline 패스)"
**Method**: 사용자가 md 파일 직접 입력 시 답변이 유실되어, AI가 9문항을 선택형 UI로 순서대로(4+4+1 배치) 제시하고 응답을 수집해 requirement-verification-questions.md의 [Answer]: 태그에 기입.
**AI Response**: 9문항 답변을 requirement-verification-questions.md에 반영. aidlc-state.md 갱신 — Programming Languages=TypeScript(NestJS 백엔드 + React 프론트), Build System=npm/SQLite, Extension Configuration(Security=No, PBT=No, Resiliency=No), Requirements Analysis 단계 [x] 완료 표시.
**확정 기술스택**: 백엔드 Node.js+NestJS / 프론트 React / DB SQLite / 자동로그인 localStorage / 다중 매장 / 로컬 실행 한정.
**Context**: INCEPTION - Requirements Analysis 답변 완료. 다음 단계(요구사항 문서 확정 → User Stories) 진행 대기.

---

## Requirements Analysis — 세션 재개 (다음 단계 안내 요청)
**Timestamp**: 2026-06-19T11:05:00Z
**User Input**: "requirement 질문에 모두 입력했어. 다음 단계는?" → 컨텍스트 부재 안내 후 → "aws ai dlc prompt 로 시작했어. 그 첫 단계가 requirement 질문 입력이 있어서 그거 한거였고, 이어서 진행해줘." → "진행" → "지속해줘."
**AI Response**: 워크스페이스/state/audit 재로드 → Requirements Analysis Step 7 진입 → Plan Gate 제시 → 승인 → `aidlc-docs/inception/requirements/requirements.md` 생성(Intent 분석 + 9문항 답변 통합 + FR 9개 + NFR 10개 + Out of Scope + Extension Configuration + 핵심 비즈니스 룰).
**Context**: INCEPTION - Requirements Analysis Step 7 완료. Step 9 Completion Gate(승인 대기) 직전.

---

## Requirements Analysis — Approval Gate Prompt
**Timestamp**: 2026-06-19T11:05:30Z
**AI Response**: requirements.md 생성 완료 알림 + 표준 Completion 메시지(REVIEW REQUIRED + WHAT'S NEXT — Request Changes / Approve & Continue) 제시. User Stories는 다음 스테이지에서 ALWAYS Execute 판정(다중 페르소나 + 사용자 워크플로우 + 복잡 비즈니스 룰). "Add User Stories" 옵션은 제시하지 않음.
**Context**: INCEPTION - Requirements Analysis Step 9. 사용자 승인 대기.

---

## Git Commit & Push 시도
**Timestamp**: 2026-06-19T11:15:00Z
**User Input**: "현재 git 으로 커밋해줘." → 커밋 6f1873b 생성 (4파일 +394 lines) → "push 진행해줘." → main 직접 push가 auto mode classifier에 차단 → 사용자에게 3가지 옵션 제시 → "1" (권한 룰 추가) 선택 → update-config 스킬 진입 → 사용자가 중단(Request interrupted).
**AI Response**: 커밋은 완료(로컬 main, origin 1 ahead). push는 미완료. settings.local.json 생성 작업 중단.
**Context**: 워크플로우 단계 변경 없음 — Requirements Analysis Approval Gate 유지.

---

## Requirements Analysis — 변경 요청 + 다음 단계 승인
**Timestamp**: 2026-06-19T11:20:00Z
**User Input**: "requirements.md 에서 관리자 세션 16시간만 한달로 변경해줘. 그리고 다음 단계로 넘어가자."
**AI Response**: requirements.md 두 곳 수정 — (1) FR-A1 매장 인증 16시간 → 1개월(30일), (2) NFR-2 관리자 세션 16시간 → 1개월(30일). FR-A3의 테이블 태블릿 16시간 세션은 변경 대상 아님(고객 측, 사용자 명시 = "관리자 세션 16시간만"). aidlc-state.md Requirements Analysis [x] 완료 표시 + Current Stage → User Stories Part 1.
**확정 변경**: 관리자 JWT 세션 30일.
**Context**: INCEPTION - Requirements Analysis 명시 승인 완료 → User Stories Part 1 (Planning) 진입.

---

## User Stories Part 1 — Assessment + Story Plan 작성
**Timestamp**: 2026-06-19T11:21:00Z
**AI Response**: user-stories.md 룰 로드. Intelligent Assessment → ALWAYS Execute 판정(High Priority: New User Features + Multi-Persona + Complex Business Logic). user-stories-assessment.md + story-generation-plan.md 작성, plan에 임베디드 clarifying questions 포함.
**Context**: INCEPTION - User Stories Part 1 Step 7(질문 제시). 사용자 답변 대기.

---

## User Stories Part 1 — Clarifying Questions 답변 수집 (5문항)
**Timestamp**: 2026-06-19T11:22:00Z
**User Input (선택형 UI 응답, raw)**: "Q1=3개(고객+점주+알바생) / Q2=Connextra As a/I want/so that + AC / Q3=Given/When/Then (Gherkin) / Q4=Feature-Based (FR 단위 1:N) / Q5=세부 단위(Small) 한 화면=1 스토리"
**Method**: AskUserQuestion 선택형 UI 두 라운드(Q1~Q4 + Q5)로 수집.
**AI Response**: story-generation-plan.md의 5개 [Answer] 태그 모두 기입. Step 9 Ambiguity 분석 → vague/contradictory/missing 응답 없음(모두 명확한 단일 선택). Step 10 follow-up 불필요. → Step 12 Plan Approval Gate 진행.
**Context**: INCEPTION - User Stories Part 1 Step 12. Plan 승인 대기.

---

## User Stories Part 1 — Plan Approval Gate Prompt
**Timestamp**: 2026-06-19T11:23:00Z
**AI Response**: Story Generation Plan 승인 요청 메시지 사용자에게 제시 — Plan 내용 요약(3 페르소나 / Connextra / G-W-T / Feature-Based / Small 단위) + Section B 9단계 체크리스트 미리보기 + Approve/Request Changes 옵션. 승인 시 Part 2 Generation으로 진입.
**Context**: INCEPTION - User Stories Part 1 Step 13. 사용자 plan 승인 대기.

---

## User Stories Iteration 3 v2.1 — 단순화·품절·흐름 수정 + P2 페르소나 잔재 제거
**Timestamp**: 2026-06-19T13:00:00Z
**User Input (raw)**:
> 1차: "페르소나에서 점주에서 '신규테블릿 초기설정' 이런 거 잘못들어간 것 같은데? 잘못들어간 게 맞다면, 지워줘."
> 2차: "[불필요한 것. 뺄것.] C1-2. n명 함께 보고 있어요. A2-4, A2-5. [수정할 것] C4-1. 고객에게 주문번호 보여줄 필요 없고, 그냥 주문내역 보여주기. 메뉴 제거는 있는데, 잘 나가는 메뉴 오늘은 '품절' 된 것들 '품절' 표시는 하면 좋을듯"
**AI Response**:
  - **personas.md**: P2 점주 니즈에서 v1 잔재 "⑥ 신규 태블릿 초기 설정" 제거 (5개로 정리).
  - **requirements.md v2**: FR-A2 단순화(상태 변경·테이블 필터·참가자 수 부가표시 제거), FR-A4 확장(품절 토글), Menu에 `soldout` 컬럼 신규 + Order에 주문 상태 컬럼 MVP 미포함 명시, §5 Out of Scope에 "주문 상태 워크플로우" "테이블 필터링" "참가자 합류 가시화" 3항목 추가.
  - **stories.md v2**:
    - 제거 3개: US-C1.2 (n명 함께 보고 있어요), US-A2.4 (주문 상태 변경), US-A2.5 (테이블 필터링) — 결번 처리(재사용 X) + 제거 사유 메모 보존.
    - 신규 1개: US-A4.4 메뉴 품절 토글 (점주/알바 → SSE 푸시 + 장바구니·주문 보호 + 수정 시 플래그 유지).
    - 수정: US-C4.1 확정 후 흐름(주문번호 5초 표시·메뉴 화면 리다이렉트 → **주문 내역 화면 이동**), US-A2.2 카드(참가자 수 제거), US-A2.3 상세(상태 컬럼 제거), US-C5.1 행 컬럼(상태 제거), US-C2.1 AC 보강(품절 표기), US-C3.1 AC 보강(품절 담기 차단·담은 후 품절 전환 안내).
    - 표 갱신: INVEST에서 제거 행 ~~취소선~~ 처리 + US-A4.4 추가. Persona 매핑에서 제거 행 삭제 + US-A4.4 추가(P2 ● P3 ●). Traceability FR-A2 단순화, FR-A4 품절 토글 포함, NFR-1/NFR-6 갱신.
    - 헤더: 27 → **25 스토리** (고객 12 + 관리자 13).
  - **aidlc-state.md**: Current Stage 갱신.
**Context**: INCEPTION - User Stories Iteration 3 v2.1 완료. Approval Gate 유지(이전 승인 결과는 정리로 미세 변경 — 사용자 명시 변경만 반영).

---

## User Stories Iteration 3 — v2 재작성 (BYOD/QR/공동장바구니/광고)
**Timestamp**: 2026-06-19T12:30:00Z
**User Input**: "다음으로 진행해줘."
**AI Response**: v2 Requirements 승인 → User Stories Iteration 3 진입.
  - personas.md v2: 사용 디바이스 BYOD 본인 폰으로 갱신(P1 진우·P4 정희), Voice·페인 포인트 보강(QR 스캔 장벽·일행 동시 사용 등). P4 권한 모델 표 확장(QR 스캔 입장·공동 장바구니 컬럼 추가).
  - stories.md v2: v1 23 스토리 → v2 27 스토리 전면 재작성. 공통 비즈니스 룰 CR-1~CR-5 갱신 + CR-6(공동 장바구니 동시성) + CR-7(광고 단방향) 신규.
    - 고객 13개: US-C0.1(도움말), US-C0.2(큰글자+시스템폰트), US-C1.1(QR 스캔 입장), US-C1.2(참가자 합류 가시화 — 신규), US-C2.1(반응형 메뉴 탐색), US-C3.1~3.4(공동 장바구니 추가·비우기·복원·동시성), US-C4.1·C4.2(주문 확정/실패 + SSE 동기화), US-C5.1(테이블 전체 내역), US-C6.1(광고 슬롯 — 신규).
    - 관리자 14개: US-A1.1~1.3(인증·세션·시도제한), US-A2.1~2.5(SSE 모니터링 + 참가자 수), US-A3.1(QR 발급·인쇄·재발급 — 재작성), US-A3.2(직권 삭제 + SSE), US-A3.3(세션 종료 + 토큰 일괄 무효화), US-A3.4(과거 내역), US-A4.1~4.3(메뉴 관리).
    - INVEST 체크 + Persona 매핑(P4 추가) + FR/NFR Traceability 갱신 — FR-C1~C6 + FR-A1~A4 모두 ≥1 스토리 커버, NFR-11/12 등 신규 NFR도 분산 커버.
  - aidlc-state.md: User Stories Iteration 3 [x] + Current Stage 갱신.
**Context**: INCEPTION - User Stories Iteration 3 완료. Approval Gate. 다음 = Workflow Planning.

---

## Requirements Analysis Iteration 2 — v2 작성 완료
**Timestamp**: 2026-06-19T12:05:00Z
**User Input**: "그럼 거기로 돌아가자. A 로 가자." → 옵션 A(덮어쓰기 + git tag 보존) 선택. 5문항 답변 라운드 1·2 수집(Q1~Q4 + Q5).
**User Input (5문항 답변, raw)**: "Q1=공동 장바구니(테이블 세션 단위 1개) / Q2=테이블 전체(계산서 느낌) / Q3=테이블당 영구 고정 / Q4=모바일 웹만(PWA) / Q5=이번에 함께 포함(단방향 모두의주차장 배너 1~2개)"
**Method**: 선택형 UI 두 라운드(4+1).
**AI Response**:
  - git tag `v1-shared-tablet` → origin push (commit 4064878).
  - audit.md 최상단 ROLLBACK MARKER 섹션 추가 — v1/v2 모델 차이·롤백 방법 명시.
  - aidlc-state.md Version Markers + Iteration 2 진입 표시.
  - requirement-verification-questions-v2.md 생성 + 5문항 답변 기입 + Ambiguity 분석(vague 없음).
  - requirements.md v2 완전 재작성 — FR-C1 QR 스캔 / FR-C3 공동 장바구니 + SSE / FR-C5 테이블 전체 가시성 / FR-C6 신규 광고 슬롯 / FR-A3 QR 발급·인쇄·무효화 / 데이터 모델 SessionParticipant·Cart·Advertisement 신규 / NFR-11 반응형·BYOD + NFR-12 동시성 신규.
  - constraints.md 갱신 — 광고 기능 부분 해제(단방향 허용·풀 시스템 제외) + 푸시 알림 SSE 대체 명시 + 네이티브 앱 제외 신규 항목 추가.
**확정 v2 사양**: BYOD(본인 폰) + QR 스캔 입장 + 영구 QR + 공동 장바구니(테이블 세션 1개) + 테이블 전체 주문 가시성 + 모바일 웹/PWA + 모두의주차장 단방향 배너.
**Context**: INCEPTION - Requirements Analysis Iteration 2 완료. Approval Gate(승인 대기).

---

## User Stories Part 2 — P4 페르소나 + 스토리 보강 (Iteration 2)
**Timestamp**: 2026-06-19T11:40:00Z
**User Input**: "디지털리터러시가 부족한 50대 고객 페르소나, 유저스토리도 추가해줘."
**AI Response**:
  - personas.md: P4 "정희" (50대 후반, 디지털 친화도 하, 시인성·실수 방지·도움말 needs) 추가. 권한 모델 표에 P4 행 추가(P1과 동일 권한, UX 차이만).
  - stories.md: 신규 2개 스토리 추가 — US-C0.1 (처음 사용자 도움말·튜토리얼) + US-C0.2 (큰 글자·고대비 모드 토글). NFR-4 확장 영역으로 분류. US-C4.1 AC에 "최종 확정 직전 강화 확인" 시나리오 추가(60×60px 큰 버튼·총액 큰 글자 요약). Persona 매핑표에 P4 컬럼 추가, US-C 전체 스토리에 P4 ● 매핑(US-C0.1/0.2는 P4 ●, P1 ○ — 1차/2차 사용자 구분). INVEST 표·NFR Traceability 갱신. 총 스토리 21 → 23.
  - aidlc-state.md: 4 페르소나·23 스토리로 Current Stage 갱신.
**Context**: INCEPTION - User Stories Part 2 Iteration 2 완료. Approval Gate 재유지(승인 대기).

---

## User Stories Part 1 — Plan 승인 + Part 2 Generation 진입
**Timestamp**: 2026-06-19T11:25:00Z
**User Input**: "다음 진행해줘."
**AI Response**: Plan 승인 응답으로 해석(Approve & Continue). TodoWrite로 B1~B9 트래킹. Part 2 실행:
  - B2: personas.md 생성 — P1 매장 고객 진우, P2 점주 수민, P3 알바 도윤 + 권한 모델 주석(MVP 한정 P2·P3 동일 자격).
  - B3: stories.md 생성 — 총 21 스토리(고객 8: US-C1.1~C5.1 / 관리자 13: US-A1.1~A4.3). 각 스토리에 Connextra + Given/When/Then AC. 공통 비즈니스 룰(CR-1~CR-5: 매장ID 격리·세션 라이프사이클·현재 세션 가시성·스냅샷 보존·bcrypt 해싱) 별도 섹션화 후 cross-cutting 인용.
  - B4: INVEST 체크표 — 21 스토리 모두 점검, ⚠️ 표시 6개는 mock·stub 분리 가능으로 Independent 정신 유지 판정.
  - B5: Story–Persona 매핑표.
  - B6: Story–FR Traceability 매트릭스 — FR-C1~C5, FR-A1~A4 모두 ≥1 스토리 커버 확인. NFR-1·2·3·4·5·6·10도 분산 커버.
  - B7: aidlc-state.md User Stories [x] 표시 + Current Stage 갱신.
**Context**: INCEPTION - User Stories Part 2 Step 19 직전. Step 20 Completion Message 제시 예정.

---
