import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateOrderResponse, OrderDto } from '@table-order/shared';
import { OrderService } from './order.service';
import { QrTokenGuard } from '../../common/guards/qr-token.guard';
import { SessionScopeGuard } from '../../common/guards/session-scope.guard';

@ApiTags('orders')
@UseGuards(QrTokenGuard, SessionScopeGuard)
@Controller('sessions/:sessionId/orders')
export class OrderController {
  constructor(private readonly service: OrderService) {}

  @Get()
  list(@Param('sessionId') sid: string): Promise<OrderDto[]> {
    return this.service.listForSession(sid);
  }

  @Post()
  create(@Param('sessionId') sid: string): Promise<CreateOrderResponse> {
    return this.service.createOrder(sid);
  }
}
