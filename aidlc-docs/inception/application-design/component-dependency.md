# Component Dependency — 테이블오더 서비스 (v2)

> **Stage**: INCEPTION · Application Design · Step 10 산출물 (4/4)
> **Inputs**: [`components.md`](components.md) · [`component-methods.md`](component-methods.md) · [`services.md`](services.md)

본 문서는 **컴포넌트 의존 매트릭스 + 통신 패턴 + 핵심 use-case 시퀀스 다이어그램 3개**를 다룬다.

---

## 1. 패키지·유닛 의존 (workspaces 레벨)

```mermaid
flowchart LR
    shared[packages/shared<br/>DTO + SSE Event 타입]
    backend[packages/backend<br/>NestJS + SQLite]
    customer[packages/customer-web<br/>React PWA]
    admin[packages/admin-web<br/>React SPA]

    shared --> backend
    shared --> customer
    shared --> admin

    customer -. HTTP REST + SSE .-> backend
    admin    -. HTTP REST + SSE .-> backend

    classDef pkg fill:#BBDEFB,stroke:#1976D2,stroke-width:2px,color:#000
    classDef client fill:#C8E6C9,stroke:#2E7D32,stroke-width:2px,color:#000
    classDef shared fill:#FFE0B2,stroke:#E65100,stroke-width:2px,color:#000
    class shared shared
    class backend pkg
    class customer,admin client
```

- `shared`는 frontend·backend 모두 import. 순환 의존 없음.
- frontend ↔ backend 간 직접 코드 의존 없음 — HTTP/SSE 프로토콜로만 연결.

---

## 2. Backend NestJS 모듈 의존 매트릭스

행이 열을 의존(import).

|              | Auth | Store | Table | Menu | Cart | Order | Sse | Ads | Admin | Common |
|--------------|:----:|:-----:|:-----:|:----:|:----:|:-----:|:---:|:---:|:-----:|:------:|
| **Auth**     |  —   |   ●   |       |      |      |       |     |     |       |   ●    |
| **Store**    |      |   —   |       |      |      |       |     |     |       |   ●    |
| **Table**    |      |   ●   |   —   |      |   ●  |   ●   |  ●  |     |       |   ●    |
| **Menu**     |      |   ●   |       |  —   |      |       |  ●  |     |       |   ●    |
| **Cart**     |      |   ●   |   ●   |   ●  |  —   |       |  ●  |     |       |   ●    |
| **Order**    |      |   ●   |   ●   |   ●  |   ●  |   —   |  ●  |     |       |   ●    |
| **Sse**      |      |       |       |      |      |       |  —  |     |       |   ●    |
| **Ads**      |      |   ●   |       |      |      |       |     |  —  |       |   ●    |
| **Admin**    |      |   ●   |   ●   |   ●  |   ●  |   ●   |  ●  |  ●  |   —   |   ●    |
| **Common**   |      |       |       |      |      |       |     |     |       |   —    |

**관찰**:

- `CommonModule`은 모든 모듈이 의존(가드·인터셉터·EventEmitter2 wiring 제공).
- `SseModule`은 `EventEmitter2`만 의존하고 도메인을 모름 — 역방향 의존(decoupled). 도메인 모듈이 SseService를 직접 호출하거나 EventEmitter로 emit.
- `OrderModule`이 가장 다인 협력자 (Table·Cart·Menu·Sse) — `createOrder()` 유스케이스 복잡도 반영.
- `AdminModule`은 read-only orchestrator라 거의 모든 도메인 의존하지만 쓰기는 안 함.
- **순환 의존 없음**: Table → Order? Order → Table은 OK. Table → Cart, Order → Cart도 OK. Cart는 Menu만 (단방향).

---

## 3. 통신 패턴 (Communication Patterns)

| 패턴 | 사용 위치 | 비고 |
|------|-----------|------|
| **HTTP REST (요청-응답)** | Customer Web → Backend, Admin Web → Backend | 모든 쓰기·읽기 표준. NestJS Swagger 자동 문서화. (Q2 결정) |
| **SSE (서버 → 클라이언트 푸시)** | Backend → Customer Web (`/sse/sessions/:sessionId`), Backend → Admin Web (`/sse/stores/:storeId`) | 단방향. NFR-1 ≤2초, NFR-6 SSE 전송. keep-alive 15초. |
| **DI (Backend 내부)** | NestJS 모듈 간 서비스 호출 | `@Injectable()` + 생성자 주입. `forwardRef`로 순환 회피(필요 시). |
| **EventEmitter2 (Backend 내부)** | 도메인 서비스 ↔ SseService | 도메인 → emit → SseService listener → 채널 라우팅. 결합도 ↓. |
| **localStorage (Frontend)** | useSessionToken, useAdminAuth, useAccessibility | 세션 토큰 + UI 설정만 (NFR-5) |
| **React Query 캐시 (Frontend)** | TanStack Query | SSE 수신 → setQueryData / invalidateQueries로 캐시 갱신 (Q5) |

### 3.1 클라이언트 → 서버 → SSE 브로드캐스트 흐름 (공통 패턴)

```text
Customer A 폰         Backend              Customer B 폰
   │                    │                     │
   │ POST /cart/items   │                     │
   ├───────────────────▶│                     │
   │                    │                     │
   │  (transaction)     │                     │
   │                    │                     │
   │  Cart version+1    │                     │
   │  SSE emit          │                     │
   │                    ├─── EventStream ────▶│ cart.updated
   │  200 OK CartDto    │     event           │ (≤2초)
   │◀───────────────────┤                     │
   │                    │                     │
```

- 모든 쓰기 경로가 동일 모양: REST 요청 → 트랜잭션 → 응답 + SSE 브로드캐스트.
- 요청자 본인도 SSE를 수신 (idempotent — 버전 체크로 중복 갱신 무해). 단, REST 응답이 먼저 도달하므로 본인 화면은 즉시 갱신.

---

## 4. 핵심 Use-Case 시퀀스 다이어그램 3개

### 4.1 시퀀스 1 — 고객 QR 스캔 입장 (US-C1.1)

```mermaid
sequenceDiagram
    autonumber
    actor User as 고객 (BYOD 폰)
    participant CW as Customer Web<br/>(React PWA)
    participant API as Backend REST<br/>(TableController)
    participant TS as TableService
    participant DB as SQLite

    User->>CW: QR 스캔 (카메라/QR 앱)
    CW->>CW: /qr/:token 라우트 진입
    CW->>API: POST /qr/scan/{token}
    API->>TS: scanQr(token)
    TS->>DB: SELECT Table WHERE qrToken
    DB-->>TS: Table | null
    alt 토큰 무효 / 매장 영업종료
        TS-->>API: 403
        API-->>CW: 403 + reason
        CW-->>User: "잠시 후 다시 시도하세요"
    else 정상
        TS->>DB: INSERT SessionParticipant<br/>(tableId, sessionId=null, deviceToken)
        DB-->>TS: participantId
        TS-->>API: { sessionToken, sessionId=null, storeName, tableNumber }
        API-->>CW: 200 OK
        CW->>CW: localStorage.set(sessionToken, …)
        CW->>CW: navigate('/menu')
        CW->>API: GET /menus?storeId=…
        API-->>CW: MenuDto[]
        CW-->>User: 메뉴 화면 + 매장명·테이블번호 헤더
    end
```

**참고**: 세션은 아직 안 생긴 상태(첫 주문 시점에 생성). SessionParticipant.sessionId가 null이면 첫 주문 시 OrderService가 bind.

---

### 4.2 시퀀스 2 — 공동 장바구니 추가 + SSE 브로드캐스트 (US-C3.1)

```mermaid
sequenceDiagram
    autonumber
    actor A as 고객 A
    actor B as 고객 B (같은 테이블)
    participant CWA as Customer Web (A)
    participant CWB as Customer Web (B)
    participant API as CartController
    participant CS as CartService
    participant MS as MenuService
    participant SSE as SseService
    participant DB as SQLite

    Note over B,CWB: B는 이미 /sse/sessions/{sid} 구독 중
    A->>CWA: 메뉴 "담기" 탭
    CWA->>API: POST /sessions/{sid}/cart/items<br/>{ menuId, quantity }
    API->>API: QrTokenGuard + SessionScopeGuard
    API->>CS: addItem(sid, dto)
    CS->>MS: assertNotSoldout(menuId)
    alt 품절
        MS-->>CS: throw 409
        CS-->>API: 409
        API-->>CWA: 409 "품절 메뉴입니다"
    else 정상
        CS->>DB: BEGIN
        CS->>DB: SELECT Cart FOR UPDATE (row lock)
        CS->>DB: UPSERT CartItem
        CS->>DB: UPDATE Cart SET version=version+1
        CS->>DB: COMMIT
        CS->>SSE: emit('cart.updated', { sid, version, items, total })
        SSE-->>CWA: event: cart.updated
        SSE-->>CWB: event: cart.updated (≤2초)
        CS-->>API: CartDto
        API-->>CWA: 200 OK CartDto
        CWA->>CWA: queryClient.setQueryData(['cart'], dto)
        CWB->>CWB: queryClient.setQueryData(['cart'], dto)<br/>(SSE handler)
    end
```

**Note**: A의 POST 응답과 B의 SSE event는 거의 동시에 도착. 둘 다 `version`이 같으므로 idempotent. B의 React Query 캐시는 `setQueryData`로 즉시 갱신 → 화면 깜박임 없음.

---

### 4.3 시퀀스 3 — 주문 확정 + 관리자 대시보드 갱신 (US-C4.1 + US-A2.1)

```mermaid
sequenceDiagram
    autonumber
    actor A as 고객 A
    actor Admin as 관리자
    participant CWA as Customer Web (A)
    participant CWB as Customer Web (B)
    participant AW as Admin Web
    participant API as OrderController
    participant OS as OrderService
    participant TS as TableService
    participant CS as CartService
    participant MS as MenuService
    participant SSE as SseService
    participant DB as SQLite

    A->>CWA: "주문 확정" 탭
    CWA->>CWA: 강화 확인 다이얼로그 (P4 보조)
    A->>CWA: "주문하기" 확인
    CWA->>API: POST /sessions/{sid}/orders
    API->>OS: createOrder(sid)
    OS->>DB: BEGIN
    OS->>TS: getOrCreateActiveSession(tableId)
    TS->>DB: SELECT/INSERT TableSession
    Note over TS: sessionCreated 플래그 셋 (첫 주문이면 true)
    OS->>CS: snapshotForOrder(sid)
    CS-->>OS: CartItemSnapshot[]
    OS->>MS: assertNotSoldout(menuId) × N
    OS->>DB: INSERT Order + OrderItem[] (CR-4 스냅샷)
    OS->>CS: clear(sid) (Cart.version+1)
    OS->>DB: COMMIT
    OS->>SSE: emit('cart.cleared', { sid })
    OS->>SSE: emit('order.created', { sid, order })
    alt sessionCreated == true
        OS->>SSE: emit('session.started', { tableId, sid })
    end

    par 고객 채널 브로드캐스트
        SSE-->>CWA: cart.cleared + order.created
        SSE-->>CWB: cart.cleared + order.created
        CWA->>CWA: navigate('/orders') (v2.1)
        CWB->>CWB: 장바구니 비움 + 주문내역 갱신
    and 매장 채널 브로드캐스트
        SSE-->>AW: session.started (if any)
        SSE-->>AW: order.created
        AW->>AW: 테이블 카드 갱신 + 강조 애니메이션
    end

    OS-->>API: { order, cart: cleared }
    API-->>CWA: 200 OK
```

**Note**: 관리자 대시보드는 별도 채널(`/sse/stores/:storeId`) 구독. 같은 도메인 이벤트가 세션 채널 + 매장 채널 양쪽에 동시 발화. 페이로드는 매장 채널이 `tableId` 추가로 풍부.

---

## 5. Frontend 모듈 의존 (Customer / Admin 공통 패턴)

```mermaid
flowchart TD
    Pages[pages/]
    Containers[containers/]
    Components[components/]
    Hooks[hooks/]
    API[api/]
    Shared[packages/shared]
    Styles[styles/]

    Pages --> Containers
    Pages --> Hooks
    Containers --> Components
    Containers --> Hooks
    Hooks --> API
    API --> Shared
    Pages --> Styles
    Components --> Styles

    classDef layer fill:#E3F2FD,stroke:#1976D2,stroke-width:1px,color:#000
    class Pages,Containers,Components,Hooks,API,Styles layer
    classDef shared fill:#FFE0B2,stroke:#E65100,stroke-width:2px,color:#000
    class Shared shared
```

- 단방향 의존 (Pages → Containers → Components → Styles, Containers → Hooks → API → Shared).
- 컴포넌트는 hooks를 직접 호출하지 않는다 (containers가 데이터 fetching 담당, components는 props만).

---

## 6. 의존 관계 요약

- **순환 의존 없음** (Backend·Frontend 양쪽).
- **공유 패키지 1개** (`shared`) — DTO + SSE 이벤트 타입 단일 진실 소스.
- **Cross-cutting 1개** (`CommonModule`) — 모든 도메인 모듈이 의존, 가드/인터셉터 제공.
- **이벤트 디커플링** — 도메인 서비스 ↔ SseService는 EventEmitter2 경유, 직접 의존 최소화.
- **클라이언트-서버 분리** — REST + SSE 프로토콜만 공유, 코드 의존 없음.
