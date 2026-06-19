# U3 Admin Web — Business Logic Model (v2.2)

> **Stage**: CONSTRUCTION · U3 · Functional Design Step 6 산출물 (1/4)

본 문서는 **관리자 데스크톱 SPA의 client-side 워크플로우**를 정의한다.

---

## 1. Client UC 카탈로그 (14개)

| # | UC | 트리거 | 백엔드 호출 | 커버 스토리 |
|---|----|--------|-------------|-------------|
| A-UC1 | 매장 로그인 | LoginPage 폼 제출 | POST `/admin/auth/login` | US-A1.1, A1.3 |
| A-UC2 | JWT 만료 자동 로그아웃 | 페이지 mount + 만료시각 비교 | (없음) | US-A1.2 |
| A-UC3 | 로그인 시도 제한 알림 | 응답 errorCode LOGIN_RATE_LIMITED | (해석 only) | US-A1.3 |
| A-UC4 | 대시보드 그리드 로드 | DashboardPage mount | GET `/admin/dashboard` | US-A2.2 |
| A-UC5 | SSE 실시간 갱신 | 매장 채널 구독 | SSE 매장 채널 | US-A2.1 |
| A-UC6 | 테이블 카드 클릭 → 주문 상세 | TableCard onClick | (보유 데이터 사용) | US-A2.3 |
| A-UC7 | 메뉴 등록·수정·삭제·정렬·품절 토글 | MenuManagementPage | POST/PATCH/DELETE `/admin/menus/*` | US-A4.1~4.4 |
| A-UC8 | 테이블 등록 + QR 발급 | TableManagementPage | POST `/admin/tables` | US-A3.1 |
| A-UC9 | QR 다운로드 (PNG/SVG) | "다운로드" 클릭 | GET `/admin/tables/:id/qr.png|svg` (Bearer) | US-A3.1 |
| A-UC10 | QR 재발급 (활성 세션 강제 종료) | "재발급" 클릭 + 확인 | POST `/admin/tables/:id/qr/regenerate` | US-A3.1 |
| A-UC11 | 세션 종료 | "이용 완료" 클릭 + 확인 | POST `/admin/tables/:id/session/close` | US-A3.3 |
| A-UC12 | 주문 직권 삭제 | OrderDetail "삭제" 클릭 + 확인 | DELETE `/admin/orders/:id` | US-A3.2 |
| A-UC13 | 과거 내역 조회 + 날짜 필터 | HistoryPage 진입 + 날짜 변경 | GET `/admin/history?tableId=&from=&to=` | US-A3.4 |
| A-UC14 | 로그아웃 | 헤더 "로그아웃" 클릭 | (POST `/admin/auth/logout` optional) | (보조) |

---

## 2. 핵심 워크플로우 G/W/T

### 2.1 A-UC1 — 로그인

```gherkin
Given LoginPage 폼 (storeId·username·password)
When 제출 → useLogin.mutate()
Then POST /admin/auth/login
  And 응답 200 LoginResponse → setAuth({ jwt, expiresAt })
  And navigate('/')
  Or 400 LOGIN_FAILED → 토스트 "매장ID·사용자명·비밀번호를 확인해주세요."
  Or 400 LOGIN_RATE_LIMITED → 토스트 "로그인 시도가 너무 많습니다."
```

### 2.2 A-UC5 — SSE 매장 채널

```gherkin
Given 인증된 상태 + DashboardPage 활성
When EventSource '/sse/stores/:storeId' 연결
Then 'session.started' 수신 → invalidate ['dashboard']
  And 'order.created'/'order.deleted' 수신 → invalidate ['dashboard']
  And 'session.closed' 수신 → invalidate ['dashboard']
  And 'menu.soldout.changed' 수신 → invalidate ['menus']
  And 새 주문이면 토스트 "신규 주문이 들어왔어요" (강조 애니메이션)
```

### 2.3 A-UC9 — QR 다운로드

```gherkin
Given QR 다운로드 버튼 클릭
When fetch(/admin/tables/:id/qr.png, Bearer 헤더) → Blob 변환
Then URL.createObjectURL(blob) + 임시 <a download="table-N.png"> 클릭
  And 다운로드 트리거 + URL.revokeObjectURL
```

### 2.4 A-UC10 — QR 재발급 (강제 종료 cascade)

```gherkin
Given 테이블 행 "QR 재발급" 클릭
When ConfirmDialog "외부 노출 의심이라 재발급할까요? 진행 중 세션이 즉시 종료돼요." 확인
Then POST /admin/tables/:id/qr/regenerate
  And 200 QrRegenerateResponse → invalidate ['tables'] + ['dashboard']
  And 토스트 "새 QR이 발급됐어요. 다운로드해서 부착해주세요."
```

### 2.5 A-UC11 — 세션 종료

```gherkin
Given 테이블 카드 "이용 완료" 클릭
When ConfirmDialog 확인
Then POST /admin/tables/:id/session/close
  And 200 { closedSessionId, movedOrders } → invalidate ['dashboard']
  And 토스트 movedOrders > 0 ? "주문 N건이 정산 내역으로 이동됐어요." : "활성 세션을 종료했어요."
  Or 400 SESSION_INACTIVE → 토스트 "종료할 활성 세션이 없습니다."
```

### 2.6 A-UC12 — 주문 직권 삭제

```gherkin
Given 주문 카드 상세 모달에서 "삭제" 클릭
When ConfirmDialog "정말 삭제할까요?" 확인
Then DELETE /admin/orders/:id
  And 204 → invalidate ['dashboard']
  And 토스트 "주문이 삭제됐어요. 손님 폰에도 반영됩니다."
  Or 400 ORDER_IN_HISTORY → 토스트 "이미 종료된 테이블의 주문은 수정할 수 없습니다."
```

---

## 3. SSE → 액션 매핑

| 이벤트 | 액션 |
|--------|------|
| `session.started` | invalidate `['dashboard']` |
| `session.closed` | invalidate `['dashboard']` |
| `order.created` | invalidate `['dashboard']` + 토스트 "신규 주문!" + 강조 (3초) |
| `order.deleted` | invalidate `['dashboard']` |
| `menu.soldout.changed` | invalidate `['menus']` |
| `keep-alive` | 무시 |

---

## 4. UC ↔ 스토리 Traceability

| UC | 스토리 |
|----|--------|
| A-UC1 | US-A1.1, A1.3 |
| A-UC2 | US-A1.2 |
| A-UC3 | US-A1.3 |
| A-UC4 | US-A2.2 |
| A-UC5 | US-A2.1 |
| A-UC6 | US-A2.3 |
| A-UC7 | US-A4.1~4.4 |
| A-UC8 | US-A3.1 |
| A-UC9 | US-A3.1 |
| A-UC10 | US-A3.1 |
| A-UC11 | US-A3.3 |
| A-UC12 | US-A3.2 |
| A-UC13 | US-A3.4 |
| A-UC14 | (보조) |

14 관리자 스토리 모두 커버.
