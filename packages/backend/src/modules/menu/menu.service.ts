import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager, IsNull } from 'typeorm';
import {
  CreateMenuDto,
  MenuDto,
  SessionStatus,
  SoldoutToggleDto,
  UpdateMenuDto,
} from '@table-order/shared';
import { Menu } from '../../db/entities/menu.entity';
import { MenuCategory } from '../../db/entities/menu-category.entity';
import { CartItem } from '../../db/entities/cart-item.entity';
import { Cart } from '../../db/entities/cart.entity';
import { TableSession } from '../../db/entities/table-session.entity';
import { Table } from '../../db/entities/table.entity';
import { BusinessException } from '../../common/exceptions/business.exception';

@Injectable()
export class MenuService {
  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly eventBus: EventEmitter2,
  ) {}

  async listForStore(storeId: string, includeSoldout = true): Promise<MenuDto[]> {
    const rows = await this.ds
      .getRepository(Menu)
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.category', 'c')
      .where('m.storeId = :storeId', { storeId })
      .andWhere('m.deletedAt IS NULL')
      .orderBy('c.sortOrder', 'ASC')
      .addOrderBy('m.sortOrder', 'ASC')
      .getMany();
    return rows
      .filter((m) => includeSoldout || !m.soldout)
      .map((m) => this.toDto(m));
  }

  async create(storeId: string, dto: CreateMenuDto): Promise<MenuDto> {
    if (dto.price < 1) throw new BusinessException('MENU_PRICE_INVALID', '가격은 1원 이상이어야 합니다.');
    const category = await this.ds
      .getRepository(MenuCategory)
      .findOne({ where: { id: dto.categoryId, storeId } });
    if (!category) throw new BusinessException('MENU_NOT_FOUND', '카테고리를 찾을 수 없습니다.');
    const repo = this.ds.getRepository(Menu);
    const saved = await repo.save(
      repo.create({
        storeId,
        categoryId: dto.categoryId,
        category,
        name: dto.name,
        price: dto.price,
        description: dto.description ?? null,
        imageUrl: dto.imageUrl ?? null,
        sortOrder: 0,
        soldout: false,
      }),
    );
    return this.toDto(saved, category);
  }

  async update(storeId: string, id: string, dto: UpdateMenuDto): Promise<MenuDto> {
    const menu = await this.findOwned(storeId, id);
    if (dto.categoryId) {
      const cat = await this.ds
        .getRepository(MenuCategory)
        .findOne({ where: { id: dto.categoryId, storeId } });
      if (!cat) throw new BusinessException('MENU_NOT_FOUND', '카테고리를 찾을 수 없습니다.');
      menu.categoryId = dto.categoryId;
      menu.category = cat;
    }
    if (dto.name !== undefined) menu.name = dto.name;
    if (dto.price !== undefined) {
      if (dto.price < 1) throw new BusinessException('MENU_PRICE_INVALID', '가격은 1원 이상이어야 합니다.');
      menu.price = dto.price;
    }
    if (dto.description !== undefined) menu.description = dto.description;
    if (dto.imageUrl !== undefined) menu.imageUrl = dto.imageUrl;
    const saved = await this.ds.getRepository(Menu).save(menu);
    return this.toDto(saved);
  }

  async delete(storeId: string, id: string): Promise<void> {
    const menu = await this.findOwned(storeId, id);
    const inCart = await this.ds
      .createQueryBuilder()
      .select('1')
      .from(CartItem, 'ci')
      .innerJoin(Cart, 'c', 'c.sessionId = ci.cartSessionId')
      .innerJoin(TableSession, 's', 's.id = c.sessionId AND s.status = :st', { st: SessionStatus.ACTIVE })
      .where('ci.menuId = :id', { id })
      .getRawOne();
    if (inCart) {
      throw new BusinessException(
        'MENU_IN_CART',
        '이 메뉴는 손님 카트에 담겨 있습니다. 손님이 비울 때까지 삭제할 수 없어요.',
      );
    }
    menu.deletedAt = new Date();
    await this.ds.getRepository(Menu).save(menu);
  }

  async reorder(storeId: string, ids: string[]): Promise<MenuDto[]> {
    const repo = this.ds.getRepository(Menu);
    await this.ds.transaction(async (m) => {
      let i = 0;
      for (const id of ids) {
        const menu = await m.getRepository(Menu).findOne({ where: { id, storeId } });
        if (!menu) continue;
        menu.sortOrder = i++;
        await m.getRepository(Menu).save(menu);
      }
    });
    return this.listForStore(storeId);
  }

  async toggleSoldout(storeId: string, id: string, dto: SoldoutToggleDto): Promise<MenuDto> {
    const menu = await this.findOwned(storeId, id);
    menu.soldout = dto.soldout;
    await this.ds.getRepository(Menu).save(menu);
    const activeSessions = await this.ds
      .getRepository(TableSession)
      .createQueryBuilder('s')
      .innerJoin(Table, 't', 't.id = s.tableId AND t.storeId = :storeId', { storeId })
      .where('s.status = :st', { st: SessionStatus.ACTIVE })
      .getMany();
    this.eventBus.emit('menu.soldout', {
      storeId,
      menuId: id,
      soldout: dto.soldout,
      activeSessionIds: activeSessions.map((s) => s.id),
    });
    return this.toDto(menu);
  }

  async assertNotSoldout(menuId: string, manager?: EntityManager): Promise<Menu> {
    const repo = (manager ?? this.ds.manager).getRepository(Menu);
    const menu = await repo.findOne({ where: { id: menuId, deletedAt: IsNull() } });
    if (!menu) throw new BusinessException('MENU_NOT_FOUND', '메뉴를 찾을 수 없습니다.');
    if (menu.soldout) throw new BusinessException('MENU_SOLDOUT', '품절된 메뉴입니다.');
    return menu;
  }

  private async findOwned(storeId: string, id: string): Promise<Menu> {
    const menu = await this.ds.getRepository(Menu).findOne({
      where: { id, storeId, deletedAt: IsNull() },
      relations: ['category'],
    });
    if (!menu) throw new BusinessException('MENU_NOT_FOUND', '메뉴를 찾을 수 없습니다.');
    return menu;
  }

  private toDto(menu: Menu, category?: MenuCategory): MenuDto {
    return {
      id: menu.id,
      storeId: menu.storeId,
      categoryId: menu.categoryId,
      categoryName: (category ?? menu.category)?.name ?? '',
      name: menu.name,
      price: menu.price,
      description: menu.description,
      imageUrl: menu.imageUrl,
      sortOrder: menu.sortOrder,
      soldout: menu.soldout,
    };
  }
}
