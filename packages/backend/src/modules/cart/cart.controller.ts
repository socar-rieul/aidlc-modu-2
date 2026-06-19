import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AddCartItemDto, CartDto, UpdateCartItemDto } from '@table-order/shared';
import { CartService } from './cart.service';
import { QrTokenGuard } from '../../common/guards/qr-token.guard';
import { SessionScopeGuard } from '../../common/guards/session-scope.guard';

@ApiTags('cart')
@UseGuards(QrTokenGuard, SessionScopeGuard)
@Controller('sessions/:sessionId/cart')
export class CartController {
  constructor(private readonly service: CartService) {}

  @Get()
  get(@Param('sessionId') sid: string): Promise<CartDto> {
    return this.service.getCart(sid);
  }

  @Post('items')
  add(@Param('sessionId') sid: string, @Body() dto: AddCartItemDto): Promise<CartDto> {
    return this.service.addItem(sid, dto);
  }

  @Patch('items/:itemId')
  update(
    @Param('sessionId') sid: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartItemDto,
  ): Promise<CartDto> {
    return this.service.updateItem(sid, itemId, dto);
  }

  @Delete('items/:itemId')
  remove(@Param('sessionId') sid: string, @Param('itemId') itemId: string): Promise<CartDto> {
    return this.service.removeItem(sid, itemId);
  }

  @Delete()
  clear(@Param('sessionId') sid: string): Promise<CartDto> {
    return this.service.clear(sid);
  }
}
