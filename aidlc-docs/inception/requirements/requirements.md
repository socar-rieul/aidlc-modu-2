# 테이블오더 서비스 — Requirements Document

본 문서는 AI-DLC Inception · Requirements Analysis 산출물이다.
원본 요구사항은 [requirements/table-order-requirements.md](../../../requirements/table-order-requirements.md)·[requirements/constraints.md](../../../requirements/constraints.md)에 있으며, 본 문서는 9문항 clarifying questions 답변을 통합해 **확정 사양**을 정리한다.

---

## 1. Intent Analysis

| 항목 | 값 |
|------|----|
| User Request (원문) | "테이블오더 서비스를 구축하고 싶습니다. … AI-DLC 워크플로우를 시작해봅시다." |
| Request Type | **New Project** (greenfield) |
| Scope Estimate | **System-wide** (고객·관리자 양쪽 클라이언트 + 백엔드 + DB) |
| Complexity Estimate | **Moderate ~ Complex** (실시간 SSE·세션 라이프사이클·다중 매장 데이터 모델 포함) |
| Requirements Depth | **Standard** (워크샵 PoC — 핵심 기능·NFR 정의, traceability 매트릭스는 생략) |

### 1.1 Stakeholders & Personas (요약)
- **고객 (Customer)**: 매장 테이블에 비치된 태블릿에서 메뉴 조회·장바구니·주문·내역을 사용. 로그인 액션 없음(자동 로그인).
- **매장 운영자 (Store Admin)**: 매장 인증 후 실시간 주문 모니터링·주문 직권 수정·테이블 세션 관리·메뉴 관리 수행.

상세 User Stories·Persona는 다음 스테이지(User Stories)에서 도출한다.

---

## 2. 확정 기술 스택 & 운영 제약 (9문항 답변 기반)

| 영역 | 결정 | 근거 (Q번호) |
|------|------|--------------|
| 매장 범위 | **다중 매장** — 매장 식별자로 분리 | Q1 |
| 백엔드 | **Node.js + NestJS (TypeScript)** | Q2 |
| 프론트엔드 | **React (TypeScript)** — 고객용·관리자용 공통 | Q3 |
| 데이터 저장소 | **SQLite (파일 기반)** | Q4 |
| 자동 로그인 저장 | **브라우저 localStorage** | Q5 |
| 실행 환경 | **로컬 단일 머신** — 클라우드 배포 없음 | Q6 |
| Security Baseline | **Off** | Q7 |
| Property-Based Testing | **Off** | Q8 |
| Resiliency Baseline | **Off** | Q9 |
| 빌드/패키지 | npm workspaces (mono-repo 권장 — Construction에서 확정) | 유추 |
| Java 사용 | **금지** (사용자 제약) | constraints (prompt) |

---

## 3. Functional Requirements (FR)

번호는 원본 문서의 섹션 번호를 따른다. 모든 항목 **MVP 포함 (Must-have)**.

### 3.1 고객용 (Customer)

| FR ID | 요약 | 핵심 동작 |
|-------|------|-----------|
| **FR-C1** | 테이블 태블릿 자동 로그인·세션 관리 | 1) 관리자가 1회 매장ID·테이블번호·테이블비번 입력 후 localStorage 저장 2) 이후 접속 시 저장값으로 자동 로그인. |
| **FR-C2** | 메뉴 조회·탐색 | 카테고리별 분류, 메뉴명/가격/설명/이미지 표시, 카테고리 빠른 이동, 메뉴 화면이 기본 화면. |
| **FR-C3** | 장바구니 관리 | 추가·삭제·수량 증감, 총액 실시간, 비우기, 새로고침 시에도 유지(클라이언트 영속). 서버 전송은 주문 확정 시점에만. |
| **FR-C4** | 주문 생성 | 최종 확인 → 확정 → 주문번호 표시(5초) → 장바구니 비우기 → 메뉴 화면 리다이렉트. 실패 시 에러 + 장바구니 유지. 주문 페이로드: 매장ID·테이블ID·메뉴목록(메뉴명·수량·단가)·총액·세션ID. |
| **FR-C5** | 주문 내역 조회 | **현재 세션 주문만** 시간 역순 표시(번호·시각·메뉴·금액·상태[대기중/준비중/완료]). 매장 이용 완료 처리된 세션은 제외. |

### 3.2 관리자용 (Store Admin)

| FR ID | 요약 | 핵심 동작 |
|-------|------|-----------|
| **FR-A1** | 매장 인증 | 매장ID·사용자명·비밀번호 입력 → JWT 발급 → **16시간 세션**, 새로고침 유지, 만료 시 자동 로그아웃. 비밀번호 bcrypt 저장. 로그인 시도 제한. |
| **FR-A2** | 실시간 주문 모니터링 | **SSE 기반** 그리드 대시보드. 테이블별 카드(총액·최신 n개 미리보기). 카드 클릭 → 전체 메뉴 상세. 주문 상태 변경(대기중/준비중/완료). 신규 주문 시각 강조(색/애니메이션). 테이블별 필터링. |
| **FR-A3** | 테이블 관리 | 4개 하위 기능: (1) 테이블 태블릿 초기 설정 — 테이블번호·비번 등록 + 16시간 세션 + 자동 로그인 활성화. (2) 주문 삭제(직권 수정) — 확인 팝업 → 즉시 삭제 → 총액 재계산. (3) **테이블 세션 라이프사이클** — 첫 주문 시 세션 시작, 매장 이용 완료 처리 시 세션 종료 + 현재 주문/총액 0 리셋 + 주문을 OrderHistory로 이동. (4) 과거 내역 조회 — 테이블별 시간 역순 + 날짜 필터. |
| **FR-A4** | 메뉴 관리 | 카테고리별 조회, 등록(메뉴명·가격·설명·카테고리·이미지URL), 수정, 삭제, 노출 순서 조정. 필수 필드 검증, 가격 범위 검증. |

### 3.3 데이터 모델 (도출 — 상세는 Functional Design에서 확정)

핵심 엔티티(추정):
- `Store` (매장ID, 이름, …)
- `AdminUser` (매장ID, username, password_hash[bcrypt], …)
- `Table` (매장ID, 테이블번호, 테이블비번_hash, 현재세션ID, …)
- `TableSession` (세션ID, 매장ID, 테이블ID, 시작시각, 종료시각nullable)
- `Category` (매장ID, 이름, 정렬순서)
- `Menu` (매장ID, 카테고리ID, 이름, 가격, 설명, 이미지URL, 정렬순서, 활성여부)
- `Order` (주문번호, 매장ID, 테이블ID, 세션ID, 생성시각, 상태[대기중/준비중/완료], 총액)
- `OrderItem` (주문번호, 메뉴명_스냅샷, 단가_스냅샷, 수량)
- `OrderHistory` (세션 종료 후 옮겨지는 과거 주문 — 동일 스키마 또는 `Order.archived` 플래그 — 설계 단계에서 결정)

---

## 4. Non-Functional Requirements (NFR)

| NFR ID | 카테고리 | 요구사항 | 비고 |
|--------|----------|----------|------|
| **NFR-1** | Performance | 신규 주문 발생 후 관리자 대시보드 반영 **≤ 2초** | SSE |
| **NFR-2** | Session | 관리자 세션 **16시간**, 브라우저 새로고침 유지, 만료 시 자동 로그아웃 | JWT |
| **NFR-3** | Security (최소선) | 관리자 비밀번호 **bcrypt** 해싱, 테이블 비밀번호 해싱, **로그인 시도 제한** | Security extension off지만 원본 요구사항에 명시된 항목은 유지 |
| **NFR-4** | Usability | 터치 버튼 **≥ 44×44px**, 카드형 메뉴 레이아웃, 명확한 시각적 계층 | 고객 태블릿 UX |
| **NFR-5** | Persistence (Client) | 장바구니·자동로그인 정보는 새로고침에도 유지 (localStorage) | FR-C1·FR-C3 |
| **NFR-6** | Realtime Transport | 실시간 통신은 **Server-Sent Events (SSE)** | FR-A2 명시 |
| **NFR-7** | Data Isolation | 모든 조회·집계는 매장ID 스코프 강제 | 다중 매장 (Q1) |
| **NFR-8** | Local-only | 클라우드/외부 인프라 의존 없음 — `npm` 한 줄로 로컬 기동 가능해야 함 | Q6 |
| **NFR-9** | Tech Constraint | Java 사용 금지 | 사용자 제약 |
| **NFR-10** | Testability | 단위 테스트 가능한 구조 (NestJS DI 활용) — PBT 미적용 | Q8 |

---

## 5. Out of Scope (`constraints.md` 인용)

다음은 **구현하지 않음**:

- **결제**: 실결제·PG·영수증·환불·포인트/쿠폰
- **인증·보안 고도화**: OAuth/SNS 로그인, 2FA/OTP
- **컨텐츠**: 이미지 리사이징·CMS·광고
- **알림**: 푸시·SMS·이메일·소리/진동
- **주방**: 주방 전달·재고
- **고급 기능**: 분석 대시보드·매출 리포트·재고·직원 권한·예약·리뷰·다국어
- **외부 연동**: 배달 플랫폼·POS·SNS 공유·지도·번역 API

---

## 6. Extension Configuration

| Extension | Enabled | 근거 |
|-----------|---------|------|
| Security Baseline | **No** | Q7 — 워크샵 PoC, 운영 보안 룰 패스 |
| Property-Based Testing | **No** | Q8 — 단순 CRUD/UI 위주 |
| Resiliency Baseline | **No** | Q9 — 로컬 PoC, 신뢰성 룰 패스 |

→ Construction 단계에서 이 3개 extension 룰은 **비활성** (강제 검증 없음).

---

## 7. 핵심 비즈니스 룰 요약

- **테이블 세션** = 첫 주문 시작 ~ 매장 이용 완료 처리. 종료 시 현재 주문·총액 0 리셋 + 주문은 OrderHistory로 이동.
- **현재 세션 주문**만 고객 화면에 노출 (이전 세션 invisible).
- **모든 데이터는 매장ID 스코프** — 매장 간 데이터 절대 노출 금지.
- **주문 페이로드 스냅샷**: 주문 생성 시 메뉴명·단가를 스냅샷 보존 (이후 메뉴 가격 변경에도 과거 주문 금액 안전).
- **장바구니**는 서버 미저장, 주문 확정 시점에만 서버 전송.

---

## 8. 다음 단계

1. ✅ Requirements Analysis (본 문서)
2. ▶ **User Stories** — 고객·관리자 페르소나, 스토리, Acceptance Criteria 도출
3. Workflow Planning — 이후 단계(Application Design / Units / Construction) depth 결정
