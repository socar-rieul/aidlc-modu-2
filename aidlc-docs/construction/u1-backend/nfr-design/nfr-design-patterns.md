# U1 Backend — NFR Design Patterns (v2.2)

> **Stage**: CONSTRUCTION · U1 Backend · NFR Design Step 6 산출물 (1/2)
> **Inputs**: [`nfr-requirements.md`](../nfr-requirements/nfr-requirements.md) · [`tech-stack-decisions.md`](../nfr-requirements/tech-stack-decisions.md) · [`u1-backend-nfr-design-plan.md`](../../plans/u1-backend-nfr-design-plan.md) · [`services.md`](../../../inception/application-design/services.md)

본 문서는 U1 Backend의 **NestJS 구현 패턴**(가드·인터셉터·SSE·트랜잭션·EventEmitter2·예외/검증/로깅)을 코드 스니펫 수준으로 정의한다. 인프라 컴포넌트는 [`logical-components.md`](logical-components.md).

---

## 1. 가드 체인 패턴

### 1.1 가드 5종 (services.md §3.1 그대로)

```ts
// common/guards/jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {} // passport-jwt

// common/guards/store-scope.guard.ts
@Injectable()
export class StoreScopeGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const userStoreId = req.user?.storeId;
    const targetStoreId = req.params?.storeId ?? req.body?.storeId ?? req.session?.storeId;
    if (!targetStoreId) return true; // path에 명시 없으면 user.storeId만 강제
    if (userStoreId !== targetStoreId) throw new ForbiddenException();
    return true;
  }
}

// common/guards/qr-token.guard.ts
@Injectable()
export class QrTokenGuard implements CanActivate {
  constructor(private participants: SessionParticipantRepository) {}
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const token = req.headers['x-session-token'];
    if (!token) throw new UnauthorizedException();
    const sp = await this.participants.findActiveByToken(token);
    if (!sp) throw new UnauthorizedException();
    req.session = { sessionId: sp.sessionId, tableId: sp.tableId, storeId: sp.storeId };
    return true;
  }
}

// common/guards/session-scope.guard.ts
@Injectable()
export class SessionScopeGuard implements CanActivate { /* path :sessionId ↔ req.session.sessionId */ }

// common/guards/rate-limit.guard.ts (로그인 endpoint만)
@Injectable()
export class RateLimitGuard implements CanActivate { /* StoreUser.failedAttempts + lockUntil */ }
```

### 1.2 컨트롤러 적용

```ts
@Controller('admin')
@UseGuards(JwtAuthGuard, StoreScopeGuard)
export class AdminMenuController { … }

@Controller('sessions/:sessionId')
@UseGuards(QrTokenGuard, SessionScopeGuard)
export class CustomerCartController { … }

@Controller('admin/auth')
export class AuthController {
  @Post('login')
  @UseGuards(RateLimitGuard)
  login(...) { … }
}
```

### 1.3 가드 적용 순서
1. **인증** (`JwtAuthGuard` 또는 `QrTokenGuard`) — req.user / req.session 채움
2. **스코프** (`StoreScopeGuard` / `SessionScopeGuard`) — 자원 격리
3. **RateLimit** (필요 시) — 로그인만

---

## 2. 트랜잭션 helper 패턴 (Q1: DataSource.transaction 직접)

### 2.1 서비스 내부 사용

```ts
@Injectable()
export class OrderService {
  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly tableService: TableService,
    private readonly cartService: CartService,
    private readonly menuService: MenuService,
    private readonly eventBus: EventEmitter2,
  ) {}

  async createOrder(sessionId: string): Promise<CreateOrderResponse> {
    const { order, sessionCreated, storeId, tableId } = await this.ds.transaction(async (m) => {
      const session = await this.tableService.getOrCreateActiveSession(sessionId, m); // manager 전달
      const snapshot = await this.cartService.snapshotForOrder(sessionId, m);
      if (snapshot.length === 0) throw new BusinessException('CART_EMPTY');
      for (const item of snapshot) await this.menuService.assertNotSoldout(item.menuId, m);
      const order = await this.persistOrder(m, sessionId, snapshot);
      await this.cartService.clear(sessionId, m);
      return { order, sessionCreated: session.created, storeId: session.storeId, tableId: session.tableId };
    });
    // SSE는 commit 직후 (트랜잭션 밖)
    if (sessionCreated) this.eventBus.emit('session.started', { storeId, tableId, sessionId });
    this.eventBus.emit('cart.cleared', { sessionId, version: order.cartVersion });
    this.eventBus.emit('order.created', { storeId, tableId, sessionId, order });
    return { order, cart: { sessionId, version: order.cartVersion, items: [], total: 0 } };
  }
}
```

### 2.2 cross-domain helper signature 룰

- 모든 service public method는 **`(args, manager?: EntityManager)`** 패턴.
- manager 미제공 시 자체 트랜잭션, 제공 시 reuse.

```ts
async assertNotSoldout(menuId: string, manager?: EntityManager): Promise<void> {
  const repo = (manager ?? this.ds.manager).getRepository(Menu);
  const menu = await repo.findOneBy({ id: menuId, deletedAt: IsNull() });
  if (!menu) throw new BusinessException('MENU_NOT_FOUND');
  if (menu.soldout) throw new BusinessException('MENU_SOLDOUT');
}
```

### 2.3 SSE 발화는 commit 이후

- service 내부에서 `eventEmitter.emit` 호출은 **transaction 콜백 함수 밖**에서 수행 → rollback 시 emit 안 함.

---

## 3. SSE 채널 패턴 (Q2: 클라이언트 reconcile)

### 3.1 채널 레지스트리 (in-memory)

```ts
// modules/sse/sse.service.ts
@Injectable()
export class SseService {
  private sessionChannels = new Map<string, Subject<MessageEvent>>(); // sessionId → Subject
  private storeChannels = new Map<string, Subject<MessageEvent>>();   // storeId → Subject

  subscribeSession(sessionId: string): Observable<MessageEvent> {
    const subject = this.getOrCreate(this.sessionChannels, sessionId);
    return merge(subject.asObservable(), this.keepAlive()).pipe(takeUntil(this.shutdown$));
  }
  subscribeStore(storeId: string): Observable<MessageEvent> { /* 동상 */ }

  emitToSession(sessionId: string, event: SessionSseEvent) {
    this.sessionChannels.get(sessionId)?.next({ data: event });
  }
  emitToStore(storeId: string, event: StoreSseEvent) {
    this.storeChannels.get(storeId)?.next({ data: event });
  }

  private keepAlive(): Observable<MessageEvent> {
    return interval(15_000).pipe(map(() => ({ data: { type: 'keep-alive' } } as MessageEvent)));
  }
  private getOrCreate(map: Map<string, Subject<MessageEvent>>, key: string) {
    if (!map.has(key)) map.set(key, new Subject<MessageEvent>());
    return map.get(key)!;
  }
}
```

### 3.2 SSE 컨트롤러

```ts
@Controller('sse')
export class SseController {
  constructor(private readonly sse: SseService) {}

  @Sse('sessions/:sessionId')
  @UseGuards(QrTokenGuard, SessionScopeGuard)
  session(@Param('sessionId') sid: string): Observable<MessageEvent> {
    return this.sse.subscribeSession(sid);
  }

  @Sse('stores/:storeId')
  @UseGuards(JwtAuthGuard, StoreScopeGuard)
  store(@Param('storeId') storeId: string): Observable<MessageEvent> {
    return this.sse.subscribeStore(storeId);
  }
}
```

### 3.3 EventEmitter2 → SseService 라우터

```ts
// modules/sse/sse.event-router.ts
@Injectable()
export class SseEventRouter {
  constructor(private readonly sse: SseService) {}

  @OnEvent('cart.updated')
  onCartUpdated(p: { sessionId: string; version: number; items: CartItemDto[]; total: number }) {
    this.sse.emitToSession(p.sessionId, { type: 'cart.updated', ...p });
  }

  @OnEvent('cart.cleared')
  onCartCleared(p: { sessionId: string; version: number }) {
    this.sse.emitToSession(p.sessionId, { type: 'cart.cleared', version: p.version });
  }

  @OnEvent('order.created')
  onOrderCreated(p: { sessionId: string; storeId: string; tableId: string; order: OrderDto }) {
    this.sse.emitToSession(p.sessionId, { type: 'order.created', order: p.order });
    this.sse.emitToStore(p.storeId, { type: 'order.created', tableId: p.tableId, sessionId: p.sessionId, order: p.order });
  }

  @OnEvent('order.deleted')
  onOrderDeleted(p: { sessionId: string; storeId: string; tableId: string; orderId: string }) {
    this.sse.emitToSession(p.sessionId, { type: 'order.deleted', orderId: p.orderId });
    this.sse.emitToStore(p.storeId, { type: 'order.deleted', tableId: p.tableId, sessionId: p.sessionId, orderId: p.orderId });
  }

  @OnEvent('session.started')
  onSessionStarted(p: { storeId: string; tableId: string; sessionId: string }) {
    this.sse.emitToStore(p.storeId, { type: 'session.started', tableId: p.tableId, sessionId: p.sessionId, startedAt: new Date().toISOString() });
  }

  @OnEvent('session.closed')
  onSessionClosed(p: { storeId: string; tableId: string; sessionId: string; reason: 'admin-closed' | 'qr-revoked' }) {
    this.sse.emitToSession(p.sessionId, { type: 'session.closed', reason: p.reason });
    this.sse.emitToStore(p.storeId, { type: 'session.closed', tableId: p.tableId, sessionId: p.sessionId, closedAt: new Date().toISOString() });
  }

  @OnEvent('menu.soldout')
  onMenuSoldout(p: { storeId: string; menuId: string; soldout: boolean; activeSessionIds: string[] }) {
    for (const sid of p.activeSessionIds) this.sse.emitToSession(sid, { type: 'menu.soldout.changed', menuId: p.menuId, soldout: p.soldout });
    this.sse.emitToStore(p.storeId, { type: 'menu.soldout.changed', menuId: p.menuId, soldout: p.soldout });
  }
}
```

### 3.4 클라이언트 reconcile (참조 — U2/U3 책임)

```ts
// useSseChannel (U2/U3)
const es = new EventSource(url);
es.onopen = () => {
  queryClient.invalidateQueries({ queryKey: ['cart', sessionId] });
  queryClient.invalidateQueries({ queryKey: ['orders', sessionId] });
};
es.addEventListener('cart.updated', (e) => queryClient.setQueryData(['cart', sessionId], JSON.parse(e.data)));
```

---

## 4. 예외/검증/로깅 인터셉터 패턴

### 4.1 HttpExceptionFilter (errorCode 통합)

```ts
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    if (exception instanceof BusinessException) {
      return res.status(400).json({ statusCode: 400, message: exception.message, errorCode: exception.code });
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return res.status(status).json({ statusCode: status, message: exception.message, errorCode: this.mapErrorCode(status) });
    }
    this.logger.error('Unhandled', exception as Error);
    return res.status(500).json({ statusCode: 500, message: '잠시 후 다시 시도해주세요.', errorCode: 'INTERNAL' });
  }
  private mapErrorCode(status: number): string {
    if (status === 401) return 'UNAUTHENTICATED';
    if (status === 403) return 'FORBIDDEN';
    if (status === 404) return 'NOT_FOUND';
    return 'ERROR';
  }
}

// common/exceptions/business.exception.ts
export class BusinessException extends Error {
  constructor(public readonly code: string, message?: string) { super(message ?? code); }
}
```

### 4.2 ValidationPipe (Global)

```ts
// main.ts
app.useGlobalPipes(new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: false,
  exceptionFactory: (errors) => new BusinessException('VALIDATION_FAILED', JSON.stringify(errors.map(e => e.constraints))),
}));
```

### 4.3 LoggingInterceptor

```ts
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<any> {
    const req = ctx.switchToHttp().getRequest();
    const start = Date.now();
    return next.handle().pipe(tap(() => {
      const ms = Date.now() - start;
      this.logger.log(`${req.method} ${req.url} - ${ms}ms`);
    }));
  }
}
```

---

## 5. 보안 패턴

### 5.1 bcrypt + UUIDv4 + JWT

```ts
// modules/auth/auth.service.ts
async login(dto: LoginRequest): Promise<LoginResponse> {
  const user = await this.users.findByStoreAndUsername(dto.storeId, dto.username);
  if (!user) throw new BusinessException('LOGIN_FAILED'); // user enumeration 차단
  if (user.lockUntil && user.lockUntil > new Date()) throw new BusinessException('LOGIN_RATE_LIMITED');
  const ok = await bcrypt.compare(dto.password, user.passwordHash);
  if (!ok) {
    user.failedAttempts += 1;
    if (user.failedAttempts >= 5) user.lockUntil = new Date(Date.now() + 5 * 60_000);
    await this.users.save(user);
    throw new BusinessException('LOGIN_FAILED');
  }
  user.failedAttempts = 0; user.lockUntil = null;
  await this.users.save(user);
  const jwt = await this.jwt.signAsync({ storeId: user.storeId, userId: user.id }, { expiresIn: '30d' });
  return { jwt, expiresAt: new Date(Date.now() + 30 * 86400_000).toISOString() };
}

// modules/auth/jwt.strategy.ts
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({ jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), secretOrKey: config.get('JWT_SECRET') });
  }
  validate(payload: any) { return { storeId: payload.storeId, userId: payload.userId }; }
}

// modules/table/table.service.ts (UUIDv4)
const qrToken = crypto.randomUUID();
```

### 5.2 PII/로그 마스킹

- 비밀번호 로그 X.
- JWT/세션 토큰 로그 시 마지막 4자만(`…abc1`).
- LoggingInterceptor에서 request body 로그 시 `password` 필드 자동 redact.

---

## 6. NFR ↔ 패턴 매핑 요약

| NFR | 적용 패턴 |
|-----|-----------|
| NFR-1, NFR-6, NFR-12 | §3 SSE Subject + commit-then-emit + Cart row FOR UPDATE + Cart.version |
| NFR-2 | §5.1 JWT 30일 |
| NFR-3, CR-5 | §5.1 bcrypt + UUIDv4 + AU-1 lock |
| NFR-5 | §3.4 클라이언트 reconcile + 서버 권한 Cart |
| NFR-7, CR-1 | §1 가드 체인 |
| NFR-8 | in-memory SSE, 외부 호출 없음 |
| NFR-10 | §4 인터셉터·필터, EventEmitter2 디커플링 → mock 용이 |

다음 산출물: [`logical-components.md`](logical-components.md) — in-memory SSE registry · seed bootstrap · CORS · Swagger · DataSource 등 인프라 컴포넌트 정의.
