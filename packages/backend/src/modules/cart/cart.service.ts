import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import * as crypto from 'node:crypto';
import { AddCartItemDto, CartDto, CartItemDto, UpdateCartItemDto } from '@table-order/shared';
import { Cart } from '../../db/entities/cart.entity';
import { CartItem } from '../../db/entities/cart-item.entity';
import { Menu } from '../../db/entities/menu.entity';
import { BusinessException } from '../../common/exceptions/business.exception';
import { MenuService } from '../menu/menu.service';

@Injectable()
export class CartService {
  constructor(
    @InjectDataSource() private readonly ds: DataSource,
    private readonly menuService: MenuService,
    private readonly eventBus: EventEmitter2,
  ) {}

  async getCart(sessionId: string): Promise<CartDto> {
    return this.buildDto(sessionId);
  }

  async addItem(sessionId: string, dto: AddCartItemDto): Promise<CartDto> {
    await this.menuService.assertNotSoldout(dto.menuId);
    const cartDto = await this.ds.transaction(async (m) => {
      await this.lockCart(m, sessionId);
      const repo = m.getRepository(CartItem);
      const existing = await repo.findOne({ where: { cartSessionId: sessionId, menuId: dto.menuId } });
      if (existing) {
        existing.quantity += dto.quantity;
        await repo.save(existing);
      } else {
        await repo.save(repo.create({
          id: crypto.randomUUID(),
          cartSessionId: sessionId,
          menuId: dto.menuId,
          quantity: dto.quantity,
        }));
      }
      await this.bumpVersion(m, sessionId);
      return this.buildDto(sessionId, m);
    });
    this.emitUpdate(sessionId, cartDto);
    return cartDto;
  }

  async updateItem(sessionId: string, itemId: string, dto: UpdateCartItemDto): Promise<CartDto> {
    const cartDto = await this.ds.transaction(async (m) => {
      await this.lockCart(m, sessionId);
      const repo = m.getRepository(CartItem);
      const item = await repo.findOne({ where: { id: itemId, cartSessionId: sessionId } });
      if (!item) throw new BusinessException('CART_ITEM_NOT_FOUND', '카트 항목을 찾을 수 없습니다.');
      if (dto.quantity === 0) {
        await repo.remove(item);
      } else {
        item.quantity = dto.quantity;
        await repo.save(item);
      }
      await this.bumpVersion(m, sessionId);
      return this.buildDto(sessionId, m);
    });
    this.emitUpdate(sessionId, cartDto);
    return cartDto;
  }

  async removeItem(sessionId: string, itemId: string): Promise<CartDto> {
    return this.updateItem(sessionId, itemId, { quantity: 0 });
  }

  async clear(sessionId: string): Promise<CartDto> {
    const cartDto = await this.ds.transaction(async (m) => {
      await this.lockCart(m, sessionId);
      await m.getRepository(CartItem).delete({ cartSessionId: sessionId });
      await this.bumpVersion(m, sessionId);
      return this.buildDto(sessionId, m);
    });
    this.eventBus.emit('cart.cleared', { sessionId, version: cartDto.version });
    return cartDto;
  }

  async snapshotForOrder(sessionId: string, manager: EntityManager): Promise<Array<{ menu: Menu; quantity: number }>> {
    const items = await manager.getRepository(CartItem).find({
      where: { cartSessionId: sessionId },
      relations: ['menu'],
    });
    return items.map((i) => ({ menu: i.menu, quantity: i.quantity }));
  }

  private async lockCart(m: EntityManager, sessionId: string): Promise<void> {
    // SQLite better-sqlite3 동기 트랜잭션이라 별도 SELECT FOR UPDATE 없이 application-level 직렬화
    const cart = await m.getRepository(Cart).findOne({ where: { sessionId } });
    if (!cart) throw new BusinessException('SESSION_INACTIVE', '세션이 활성 상태가 아닙니다.');
  }

  private async bumpVersion(m: EntityManager, sessionId: string): Promise<void> {
    const cart = await m.getRepository(Cart).findOne({ where: { sessionId } });
    if (!cart) return;
    cart.version += 1;
    await m.getRepository(Cart).save(cart);
  }

  private async buildDto(sessionId: string, manager?: EntityManager): Promise<CartDto> {
    const repo = (manager ?? this.ds.manager);
    const cart = await repo.getRepository(Cart).findOne({ where: { sessionId } });
    if (!cart) return { sessionId, version: 0, items: [], total: 0 };
    const rows = await repo
      .getRepository(CartItem)
      .createQueryBuilder('ci')
      .leftJoinAndSelect('ci.menu', 'm')
      .where('ci.cartSessionId = :sid', { sid: sessionId })
      .orderBy('ci.addedAt', 'ASC')
      .getMany();
    const items: CartItemDto[] = rows.map((r) => ({
      id: r.id,
      menuId: r.menuId,
      menuName: r.menu.name,
      unitPrice: r.menu.price,
      quantity: r.quantity,
      soldout: r.menu.soldout,
    }));
    const total = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    return { sessionId, version: cart.version, items, total };
  }

  private emitUpdate(sessionId: string, cart: CartDto): void {
    this.eventBus.emit('cart.updated', {
      sessionId,
      version: cart.version,
      items: cart.items,
      total: cart.total,
    });
  }
}
