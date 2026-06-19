# 요구사항 확인 질문 (Requirements Clarification)

테이블오더 서비스 요구사항을 명확히 하기 위한 질문입니다.
각 질문 아래 `[Answer]:` 태그에 **선택지 글자(A·B·C…)** 를 적어주세요. 맞는 보기가 없으면 마지막 **X) Other** 를 고르고 `[Answer]:` 뒤에 직접 설명해주세요.

> ✅ **2026-06-19 — 9문항 전체 답변 완료** (선택형 UI로 응답 받아 기입).

---

## Question 1

서비스가 지원할 **매장 범위**는 어디까지인가요? (데이터 모델·인증 구조에 영향)

A) 단일 매장만 — 매장 식별자는 고정값 1개 (PoC에 가장 단순)

B) 다중 매장 — 매장 식별자로 매장을 구분하는 구조 유지 (요구사항 문서의 "매장 식별자" 반영)

X) Other (please describe after [Answer]: tag below)

[Answer]: B — 다중 매장

---

## Question 2

**백엔드 구현 언어/프레임워크**는 무엇으로 할까요? (Java는 제외하기로 함)

A) Python + FastAPI (코드 간결, SSE·async 지원 양호 — 권장)

B) Node.js + Express (가볍고 프론트와 언어 통일)

C) Node.js + NestJS (구조적이나 보일러플레이트 다소 증가)

D) Go (성능 좋으나 코드량·러닝커브 상대적 큼)

X) Other (please describe after [Answer]: tag below)

[Answer]: C — Node.js + NestJS

---

## Question 3

**프론트엔드 구현 방식**은 무엇으로 할까요? (고객용 + 관리자용 모두 브라우저 웹UI)

A) Vanilla JS (프레임워크 없음, 의존성 최소 — 가장 가벼움)

B) React (컴포넌트 재사용·상태관리 용이, 실시간 대시보드에 유리 — 권장)

C) Vue

X) Other (please describe after [Answer]: tag below)

[Answer]: B — React

---

## Question 4

**데이터 저장소**는 무엇으로 할까요? (로컬 실행 기준. 메뉴·주문·OrderHistory 등 관계형 데이터)

A) SQLite (파일 기반, 별도 설치·서버 불필요 — 로컬 PoC에 권장)

B) PostgreSQL (로컬 설치/도커 필요, 운영급에 가까움)

C) 인메모리 (재시작 시 데이터 초기화 — 가장 단순하나 영속성 없음)

X) Other (please describe after [Answer]: tag below)

[Answer]: A — SQLite

---

## Question 5

테이블 태블릿의 **자동 로그인 정보 로컬 저장** 방식은? (요구사항: "최종 로그인 정보 로컬 저장" 후 자동 로그인)

A) 브라우저 localStorage (가장 단순·일반적 — 권장)

B) 브라우저 쿠키

X) Other (please describe after [Answer]: tag below)

[Answer]: A — localStorage

---

## Question 6

**배포/실행 환경**은? *(이전 대화 반영해 미리 채움)*

A) 로컬 단일 머신에서만 실행·확인 (클라우드 배포·인프라 없음)

B) 로컬 개발 후 추후 클라우드 배포까지 고려

X) Other (please describe after [Answer]: tag below)

[Answer]: A — 로컬 단일 머신에서만 실행

---

## Question 7

Should security extension rules be enforced for this project? *(이전 대화 반영해 미리 채움 — 오늘 패스)*

A) Yes — enforce all SECURITY rules as blocking constraints (recommended for production-grade applications)

B) No — skip all SECURITY rules (suitable for PoCs, prototypes, and experimental projects)

X) Other (please describe after [Answer]: tag below)

[Answer]: B — No (보안 룰 패스)

---

## Question 8

Should property-based testing (PBT) rules be enforced for this project? *(이전 대화 반영해 미리 채움 — 오늘 패스)*

A) Yes — enforce all PBT rules as blocking constraints (recommended for projects with business logic, data transformations, serialization, or stateful components)

B) Partial — enforce PBT rules only for pure functions and serialization round-trips (suitable for projects with limited algorithmic complexity)

C) No — skip all PBT rules (suitable for simple CRUD applications, UI-only projects, or thin integration layers with no significant business logic)

X) Other (please describe after [Answer]: tag below)

[Answer]: C — No (PBT 패스)

---

## Question 9

Should the resiliency baseline be applied to this project?

**무엇인가**: AWS Well-Architected(신뢰성 기둥) 기반의 **설계 단계 모범사례**(내결함성·고가용성·관측가능성·복구) 방향성을 요구사항·설계·코드에 반영하도록 유도합니다.
**무엇이 아닌가**: 프로덕션 준비 완료를 보장하지 않으며, 정식 Well-Architected 리뷰를 대체하지 않습니다. 초기 방향을 잡아주는 "첫 초안" 수준입니다.

A) Yes — apply the resiliency baseline as directional best practices and design-time guidance (recommended for business-critical workloads)

B) No — skip the resiliency baseline (suitable for PoCs, prototypes, and experimental projects where rapid iteration matters more than reliability)

X) Other (please describe after [Answer]: tag below)

[Answer]: B — No (복원력 baseline 패스)

