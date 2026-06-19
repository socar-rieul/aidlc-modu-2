import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'node:crypto';
import { AdSlot } from '@table-order/shared';
import { Store } from '../db/entities/store.entity';
import { StoreUser } from '../db/entities/store-user.entity';
import { Table } from '../db/entities/table.entity';
import { MenuCategory } from '../db/entities/menu-category.entity';
import { Menu } from '../db/entities/menu.entity';
import { Advertisement } from '../db/entities/advertisement.entity';

const DEMO_STORE_ID = '00000000-0000-0000-0000-000000000001';

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async run(): Promise<void> {
    const existing = await this.ds.getRepository(Store).findOne({ where: { id: DEMO_STORE_ID } });
    if (existing) {
      this.logger.log('Seed already applied, skipping.');
      return;
    }

    await this.ds.transaction(async (m) => {
      const store = await m.getRepository(Store).save(
        m.getRepository(Store).create({ id: DEMO_STORE_ID, name: '데모 매장', active: true }),
      );
      const hash = await bcrypt.hash('demo1234', 10);
      await m.getRepository(StoreUser).save([
        m.getRepository(StoreUser).create({ storeId: store.id, username: 'owner', passwordHash: hash }),
        m.getRepository(StoreUser).create({ storeId: store.id, username: 'crew', passwordHash: hash }),
      ]);

      const categories = await m.getRepository(MenuCategory).save([
        m.getRepository(MenuCategory).create({ storeId: store.id, name: '음료', sortOrder: 0 }),
        m.getRepository(MenuCategory).create({ storeId: store.id, name: '식사', sortOrder: 1 }),
        m.getRepository(MenuCategory).create({ storeId: store.id, name: '디저트', sortOrder: 2 }),
      ]);
      const [drinks, meals, desserts] = categories;

      const menus = [
        { cat: drinks, name: '아메리카노', price: 4000 },
        { cat: drinks, name: '라떼', price: 4500 },
        { cat: drinks, name: '오렌지주스', price: 5000 },
        { cat: drinks, name: '콜라', price: 2000 },
        { cat: meals, name: '카르보나라', price: 13000 },
        { cat: meals, name: '마르게리타 피자', price: 15000 },
        { cat: meals, name: '치킨샐러드', price: 10000 },
        { cat: meals, name: '스테이크', price: 25000 },
        { cat: desserts, name: '티라미수', price: 7000 },
        { cat: desserts, name: '치즈케이크', price: 7500 },
        { cat: desserts, name: '브라우니', price: 6500 },
        { cat: desserts, name: '바닐라 아이스크림', price: 4500 },
      ];
      await m.getRepository(Menu).save(
        menus.map((mn, idx) =>
          m.getRepository(Menu).create({
            storeId: store.id,
            categoryId: mn.cat.id,
            category: mn.cat,
            name: mn.name,
            price: mn.price,
            sortOrder: idx,
            soldout: false,
          }),
        ),
      );

      await m.getRepository(Table).save(
        [1, 2, 3, 4, 5].map((n) =>
          m.getRepository(Table).create({
            storeId: store.id,
            number: n,
            qrToken: crypto.randomUUID(),
            active: true,
          }),
        ),
      );

      await m.getRepository(Advertisement).save([
        m.getRepository(Advertisement).create({
          slot: AdSlot.MENU_TOP,
          imageUrl: 'https://www.moduparking.com/banner-top.png',
          clickUrl: 'https://www.moduparking.com',
          active: true,
        }),
        m.getRepository(Advertisement).create({
          slot: AdSlot.CART_BOTTOM,
          imageUrl: 'https://www.moduparking.com/banner-bottom.png',
          clickUrl: 'https://www.moduparking.com',
          active: true,
        }),
      ]);
    });

    this.logger.log('Seed applied: 데모 매장 + 5 테이블 + 12 메뉴 + 2 광고');
  }
}
