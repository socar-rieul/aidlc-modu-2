# Story Generation Plan (테이블오더 서비스)

## Purpose
Requirements Analysis 산출물(`aidlc-docs/inception/requirements/requirements.md`)을 사용자 중심 스토리·페르소나로 전환한다.

본 문서는 **Story Generation Plan + 임베디드 Clarifying Questions**를 함께 담는다.
사용자는 아래 Section A의 질문 5개에 `[Answer]:` 태그로 답하면 된다. 답변 확정 후 Section B의 체크리스트를 순서대로 실행한다.

---

## Section A. Clarifying Questions (5문항)

각 질문 아래 `[Answer]:` 태그에 **선택지 글자(A·B·C…)** 를 적어주세요. 맞는 보기가 없으면 마지막 **X) Other** 를 고르고 `[Answer]:` 뒤에 직접 설명해주세요.

> 답변 미리 채움 안내: 사용자가 이미 명시한 제약("워크샵 PoC", "AI-DLC 워크플로우 충실히")을 반영해 기본 추천을 표시했습니다. 다른 의견이 있으면 자유롭게 변경해주세요.

### Q1 — User Persona 깊이

스토리를 누구 관점에서 작성할까요? 페르소나 수가 늘수록 스토리도 늘어납니다.

A) **2개 — 핵심 페르소나만**: ① 매장 고객(테이블 사용자) ② 매장 운영자 (가장 단순, 워크샵 PoC에 권장)

B) **3개 — 운영자 분리**: ① 매장 고객 ② 점주(매장 인증 보유) ③ 매장 알바생(점주 위임 권한)

C) **4개 이상 — 세분화**: 고객도 단골/뜨내기로 분리, 운영자도 점주/매니저/알바로 분리

X) Other (please describe after [Answer]: tag below)

[Answer]: B — 3개 (고객 + 점주 + 알바생)

---

### Q2 — Story Format (작성 형식)

각 user story를 어떤 형식으로 적을까요?

A) **고전 Connextra**: "As a [persona], I want [goal], so that [benefit]." + Acceptance Criteria 체크박스 (가장 표준적 — 권장)

B) **Job Story**: "When [situation], I want to [motivation], so I can [outcome]." (상황 중심)

C) **자유 서술형**: 짧은 한 문단 + 체크리스트 (가볍지만 표준 안 따름)

X) Other

[Answer]: A — Connextra "As a/I want/so that" + AC

---

### Q3 — Acceptance Criteria 형식

각 스토리의 Acceptance Criteria를 어떤 형태로 적을까요?

A) **Given / When / Then (Gherkin)**: BDD 표준, 테스트 케이스로 바로 매핑 (권장 — 비즈니스 룰 시나리오가 많아 적합)

B) **체크리스트(Bullet)**: 짧은 조건 나열, 빠르게 훑기 좋음

C) **혼합**: 핵심 시나리오는 G/W/T, 부가 조건은 체크리스트

X) Other

[Answer]: A — Given / When / Then (Gherkin)

---

### Q4 — Story Breakdown Approach (스토리 분해 방식)

어떤 축으로 스토리를 묶을까요?

A) **Feature-Based**: requirements.md의 FR 단위(FR-C1·C2·… / FR-A1·A2·…)로 1:N 스토리 도출 (트레이서빌리티 좋음 — 권장)

B) **User Journey-Based**: 고객 주문 여정 / 운영자 일과 시작 ~ 마감 등 시간 흐름으로 묶음 (UX 친화적)

C) **Persona-Based**: 페르소나별로 모든 스토리를 별도 섹션에 (간단하지만 중복 가능)

D) **Hybrid**: Persona 1차 그룹 → Feature 2차 정렬 (가독성+추적성 절충)

X) Other

[Answer]: A — Feature-Based (FR 단위 1:N)

---

### Q5 — Story Granularity (스토리 크기)

스토리 크기 기준을 어디로 잡을까요? (INVEST의 'Small' 판정)

A) **세부 단위(Small)**: 한 화면·한 인터랙션 = 1 스토리. 스토리 수 多, 구현 추정 명확 (권장 — 워크샵 구현에 적합)

B) **중간 단위(Medium)**: 한 사용자 목표 = 1 스토리, 내부에 sub-task 체크박스. 스토리 수 中

C) **에픽 단위(Large)**: 한 기능 묶음 = 1 에픽 + 하위 스토리 분기. 계층 구조

X) Other

[Answer]: A — 세부 단위(Small) — 한 화면/인터랙션 = 1 스토리

---

> ✅ **2026-06-19 — 5문항 전체 답변 완료 + Ambiguity 분석: vague/contradictory/missing 응답 없음.**
> 다음 단계 = Plan Approval Gate → 승인 후 Section B 실행.

---

## Section B. Story Generation Execution Checklist

Section A 답변 확정 후 아래 체크리스트를 순서대로 실행한다.

- [ ] **B1.** Section A 답변 5개를 모두 수집 후 ambiguity 분석 (vague/contradictory 답변 있으면 Step 10 follow-up).
- [ ] **B2.** `aidlc-docs/inception/user-stories/personas.md` 생성 — Q1 답변에 따른 페르소나 작성:
  - 페르소나명 (예: "테이블 고객 진우", "매장 운영자 수민")
  - Demographics·역할·동기·니즈·페인 포인트
  - 컨텍스트(접속 환경: 매장 내 태블릿 / 매장 후방 데스크탑)
  - 인용 한 줄 (페르소나 voice)
- [ ] **B3.** `aidlc-docs/inception/user-stories/stories.md` 생성 — Q2/Q3/Q4/Q5 답변 형식대로:
  - 고객용 스토리 (FR-C1 ~ FR-C5 도출분)
  - 관리자용 스토리 (FR-A1 ~ FR-A4 도출분)
  - 각 스토리: ID(예 `US-C1.1`), Title, 형식별 본문, AC, 관련 FR 매핑, 관련 페르소나
- [ ] **B4.** INVEST 체크 — 각 스토리에 대해 Independent·Negotiable·Valuable·Estimable·Small·Testable 점검 표 추가.
- [ ] **B5.** Story–Persona 매핑 표 작성 (stories.md 말미).
- [ ] **B6.** Story–FR Traceability 매트릭스 (stories.md 말미) — 모든 FR이 ≥ 1개 스토리에 커버되는지 확인.
- [ ] **B7.** `aidlc-state.md`에 User Stories Part 2 [x] 표시 + 다음 단계(Workflow Planning) 진입 명시.
- [ ] **B8.** `audit.md`에 Step 19 승인 프롬프트 + 사용자 응답 로그.
- [ ] **B9.** Step 20 Completion Message(📚 User Stories Complete + REVIEW REQUIRED + WHAT'S NEXT) 사용자에게 제시.

---

## Story Breakdown Approach — Trade-off 참고 (Q4 보조)

| 방식 | 장점 | 단점 |
|------|------|------|
| Feature-Based | FR ↔ Story 1:N 매핑 명확, 빠진 기능 탐지 쉬움 | 사용자 흐름 가시성 낮음 |
| User Journey-Based | 사용 흐름·UX 가독성 좋음 | FR 누락 위험, 트레이서빌리티 약함 |
| Persona-Based | 페르소나 컨텍스트 강조 | 페르소나 간 중복 스토리 발생 |
| Hybrid (D) | 가독성 + 추적성 균형 | 구조 약간 복잡 |
| Epic-Based | 대규모 프로젝트 적합 | PoC엔 과함 |

---

## Methodology Notes
- INVEST 기준 준수: Independent / Negotiable / Valuable / Estimable / Small / Testable
- AC는 추후 테스트 케이스로 1:1 매핑 가능하도록 작성
- 매장ID 격리·테이블 세션 라이프사이클 같은 cross-cutting 룰은 별도 "공통 룰" 섹션에 정리하고 각 스토리에서 참조
- 본 plan은 Step 11 룰(implementation detail 회피)에 따라 우선순위·sprint planning은 다루지 않음
