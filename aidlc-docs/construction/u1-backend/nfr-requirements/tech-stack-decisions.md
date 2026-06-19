# U1 Backend — Tech Stack Decisions (v2.2)

> **Stage**: CONSTRUCTION · U1 Backend · NFR Requirements Step 6 산출물 (2/2)
> **Inputs**: [Application Design Q1~Q6](../../../inception/plans/application-design-plan.md) · [u1-backend-nfr-requirements-plan.md Q1~Q3](../../plans/u1-backend-nfr-requirements-plan.md) · [`requirements.md` v2](../../../inception/requirements/requirements.md)

본 문서는 U1 Backend의 **모든 기술 선택 + 의존 패키지 목록 + 버전 정책**을 단일 문서로 통합한다.

---

## 1. 기술 선택 통합표

| 영역 | 결정 | 출처 |
|------|------|------|
| 언어 | TypeScript (strict mode) | Q3, NFR-9 |
| Runtime | Node.js (>= 20 LTS 권장) | (보조) |
| 프레임워크 | NestJS | Req Q2 |
| 모듈 구조 | 도메인별 NestJS 모듈 (Auth/Store/Table/Menu/Cart/Order/Sse/Ads/Admin/Common) | App Design Q1 |
| ORM | TypeORM | App Design Q3 |
| DB | SQLite (파일 + WAL mode) | Req Q4 + NFR Q3 |
| Validation | class-validator + class-transformer | App Design Q4 |
| API 계약 | REST + 공유 DTO + Swagger UI | App Design Q2 |
| 인증 | `@nestjs/jwt` (HS256, 30일 exp) | NFR-2 |
| 비밀번호 | bcrypt (rounds=10) | CR-5 |
| Realtime | SSE (NestJS Sse decorator + RxJS Observable) | NFR-6 |
| Event Bus | `@nestjs/event-emitter` (EventEmitter2) | App Design services.md §3.5 |
| QR 발급 | `qrcode` 라이브러리 (png/svg/pdf) | UC-6 |
| UUID | Node 내장 `crypto.randomUUID()` (UUIDv4) | CR-5 |
| 로그 | NestJS built-in Logger | NFR Q1 |
| 테스트 | Jest 단위 + Supertest e2e | NFR Q2 |
| Workspace | pnpm workspaces | App Design Q6 |
| Project 구조 | `packages/backend` 단일 | unit-of-work §3.1 |

---

## 2. 예상 package.json (`packages/backend/package.json`)

```jsonc
{
  "name": "@table-order/backend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "build": "nest build",
    "start": "node dist/main",
    "dev": "nest start --watch",
    "seed": "ts-node src/seed/seed.cli.ts",
    "test": "jest",
    "test:e2e": "jest --config test/jest-e2e.json",
    "lint": "eslint . --ext .ts --fix",
    "format": "prettier --write \"src/**/*.ts\""
  },
  "dependencies": {
    "@nestjs/common": "^10",
    "@nestjs/core": "^10",
    "@nestjs/platform-express": "^10",
    "@nestjs/config": "^3",
    "@nestjs/typeorm": "^10",
    "@nestjs/jwt": "^10",
    "@nestjs/passport": "^10",
    "@nestjs/event-emitter": "^2",
    "@nestjs/swagger": "^7",
    "typeorm": "^0.3",
    "better-sqlite3": "^11",
    "passport": "^0.7",
    "passport-jwt": "^4",
    "bcrypt": "^5",
    "class-validator": "^0.14",
    "class-transformer": "^0.5",
    "rxjs": "^7",
    "qrcode": "^1.5",
    "reflect-metadata": "^0.2",
    "@table-order/shared": "workspace:*"
  },
  "devDependencies": {
    "@nestjs/cli": "^10",
    "@nestjs/schematics": "^10",
    "@nestjs/testing": "^10",
    "@types/bcrypt": "^5",
    "@types/express": "^4",
    "@types/jest": "^29",
    "@types/node": "^20",
    "@types/passport-jwt": "^4",
    "@types/qrcode": "^1.5",
    "@types/supertest": "^6",
    "jest": "^29",
    "ts-jest": "^29",
    "supertest": "^6",
    "ts-node": "^10",
    "tsconfig-paths": "^4",
    "typescript": "^5",
    "eslint": "^8",
    "prettier": "^3"
  }
}
```

**버전 정책**: caret(`^`) 범위 사용 + pnpm lockfile로 reproducibility. 메이저 업그레이드는 별도 결정.

---

## 3. shared 패키지 (`packages/shared`)

```jsonc
{
  "name": "@table-order/shared",
  "version": "0.1.0",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json"
  },
  "dependencies": {
    "class-validator": "^0.14",
    "class-transformer": "^0.5",
    "reflect-metadata": "^0.2"
  },
  "devDependencies": {
    "typescript": "^5"
  }
}
```

DTO에 class-validator 데코레이터 부착 → backend·frontend 모두 import.

---

## 4. 설정 파일

### 4.1 `tsconfig.base.json` (루트)

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "baseUrl": ".",
    "paths": {
      "@table-order/shared": ["packages/shared/src"]
    }
  }
}
```

### 4.2 SQLite DataSource (TypeORM)

```ts
// packages/backend/src/db/data-source.ts
import { DataSource } from 'typeorm';
import * as path from 'node:path';

export const dataSourceOptions = {
  type: 'better-sqlite3' as const,
  database: process.env.DB_PATH ?? path.resolve(__dirname, '../../data/app.sqlite'),
  entities: [/* TypeORM @Entity 클래스 */],
  synchronize: true, // 워크샵 PoC — production 전환 시 false + migrations
  logging: ['error', 'warn'],
  enableWAL: true, // better-sqlite3 옵션
  prepareDatabase: (db) => {
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('foreign_keys = ON');
  },
};

export const AppDataSource = new DataSource(dataSourceOptions);
```

### 4.3 .env 예시

```dotenv
NODE_ENV=development
PORT=3000
DB_PATH=./data/app.sqlite
JWT_SECRET=replace-with-256bit-random
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
LOG_LEVEL=debug
```

### 4.4 main.ts 부트스트랩 윤곽

```ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? '').split(','),
    credentials: false,
  });
  const swaggerConfig = new DocumentBuilder().setTitle('테이블오더 API').build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig));
  await app.listen(Number(process.env.PORT ?? 3000));
}
bootstrap();
```

---

## 5. 의존 그래프 (런타임)

```text
NestJS Core
├── @nestjs/config              # env 로드
├── @nestjs/typeorm + typeorm   # DB
│   └── better-sqlite3
├── @nestjs/jwt + passport-jwt  # 인증
│   └── bcrypt                   # 비밀번호 해시
├── @nestjs/event-emitter        # 도메인 이벤트
├── @nestjs/swagger              # Swagger UI
├── class-validator + class-transformer  # DTO 검증
├── rxjs                         # SSE Observable
├── qrcode                       # QR 발급
└── crypto (Node 내장)            # UUIDv4
```

---

## 6. 미사용·금지 기술

| 기술 | 사유 |
|------|------|
| Java | NFR-9 명시 금지 |
| GraphQL | App Design Q2 — REST 선택 |
| Prisma | App Design Q3 — TypeORM 선택 |
| Zod | App Design Q4 — class-validator 선택 (중복 회피) |
| Helmet | Security Extension OFF |
| Redis / Memcached | NFR-8 로컬 한정 |
| Web Push / FCM | requirements.md Out of Scope (SSE 대체) |
| pino / winston | NFR Q1 — built-in Logger 선택 |
| Docker | NFR-8 로컬 한정 (선택 — 사용자 요청 시 별도) |

---

## 7. 결정 변경 정책

- 본 문서는 **U1 Backend 사이클의 SSOT**.
- 후속 사이클(U2/U3) 진행 중 의존 추가 필요 시 본 문서 갱신 후 사용자 승인.
- 메이저 변경(예: TypeORM → Prisma 교체)은 Application Design 단계로 회귀.

---

## 8. 다음 단계

다음 NFR Design 단계에서 본 결정을 바탕으로 **NestJS 구현 패턴 코드 스니펫**(가드·인터셉터·SSE Subject·트랜잭션 helper·EventEmitter2 wiring 등)을 정의.
