import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { BusinessException } from '../src/common/exceptions/business.exception';
import { SeedService } from '../src/seed/seed.service';
import { Table } from '../src/db/entities/table.entity';
import { StoreUser } from '../src/db/entities/store-user.entity';

describe('U1 e2e — QR → Cart → Order → Admin', () => {
  let app: INestApplication;
  let ds: DataSource;

  beforeAll(async () => {
    process.env.DB_PATH = ':memory:';
    process.env.JWT_SECRET = 'test-secret-for-e2e-only';
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        exceptionFactory: (errors) =>
          new BusinessException(
            'VALIDATION_FAILED',
            '입력값을 확인해주세요.',
            errors.map((e) => ({ field: e.property, constraints: e.constraints })),
          ),
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    ds = app.get(DataSource);
    await app.get(SeedService).run();
  });

  afterAll(async () => {
    await app.close();
  });

  it('정상 흐름 — QR 스캔 → 메뉴 조회 → 카트 추가 → 주문 확정 → 카트 비움 + 주문 내역', async () => {
    const tables = await ds.getRepository(Table).find();
    const table = tables[0];

    const scan = await request(app.getHttpServer()).post(`/qr/scan/${table.qrToken}`).expect(201);
    expect(scan.body.sessionToken).toBeDefined();
    const token = scan.body.sessionToken;
    const sid = scan.body.sessionId;

    const menus = await request(app.getHttpServer()).get('/menus').set('X-Session-Token', token).expect(200);
    expect(menus.body.length).toBeGreaterThan(0);
    const americano = menus.body.find((m: any) => m.name === '아메리카노');

    const cart1 = await request(app.getHttpServer())
      .post(`/sessions/${sid}/cart/items`)
      .set('X-Session-Token', token)
      .send({ menuId: americano.id, quantity: 2 })
      .expect(201);
    expect(cart1.body.items.length).toBe(1);
    expect(cart1.body.total).toBe(americano.price * 2);
    expect(cart1.body.version).toBe(1);

    const order = await request(app.getHttpServer())
      .post(`/sessions/${sid}/orders`)
      .set('X-Session-Token', token)
      .expect(201);
    expect(order.body.order.total).toBe(americano.price * 2);
    expect(order.body.cart.items).toEqual([]);

    const orders = await request(app.getHttpServer())
      .get(`/sessions/${sid}/orders`)
      .set('X-Session-Token', token)
      .expect(200);
    expect(orders.body.length).toBe(1);
  });

  it('빈 카트 주문 확정 거부 (CART_EMPTY 400)', async () => {
    const tables = await ds.getRepository(Table).find();
    const fresh = tables[1];
    const scan = await request(app.getHttpServer()).post(`/qr/scan/${fresh.qrToken}`).expect(201);

    const res = await request(app.getHttpServer())
      .post(`/sessions/${scan.body.sessionId}/orders`)
      .set('X-Session-Token', scan.body.sessionToken)
      .expect(400);
    expect(res.body.errorCode).toBe('CART_EMPTY');
  });

  it('관리자 로그인 → 대시보드 조회', async () => {
    const login = await request(app.getHttpServer())
      .post('/admin/auth/login')
      .send({ storeId: '00000000-0000-0000-0000-000000000001', username: 'owner', password: 'demo1234' })
      .expect(200);
    expect(login.body.jwt).toBeDefined();

    const dashboard = await request(app.getHttpServer())
      .get('/admin/dashboard')
      .set('Authorization', `Bearer ${login.body.jwt}`)
      .expect(200);
    expect(dashboard.body.tables.length).toBe(5);
  });

  it('로그인 5회 실패 → 6번째 RATE_LIMITED', async () => {
    const storeId = '00000000-0000-0000-0000-000000000001';
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post('/admin/auth/login')
        .send({ storeId, username: 'crew', password: 'wrong' })
        .expect(400);
    }
    const res = await request(app.getHttpServer())
      .post('/admin/auth/login')
      .send({ storeId, username: 'crew', password: 'wrong' })
      .expect(400);
    expect(res.body.errorCode).toBe('LOGIN_RATE_LIMITED');

    // 정리 — crew 카운터 리셋
    const userRepo = ds.getRepository(StoreUser);
    const user = await userRepo.findOne({ where: { storeId, username: 'crew' } });
    if (user) {
      user.failedAttempts = 0;
      user.lockUntil = null;
      await userRepo.save(user);
    }
  });
});
