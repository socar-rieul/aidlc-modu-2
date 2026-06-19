import { Controller, Delete, Get, HttpCode, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { HistoryQueryDto, OrderHistoryDto } from '@table-order/shared';
import { OrderService } from './order.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { StoreScopeGuard } from '../../common/guards/store-scope.guard';

@ApiTags('admin/orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, StoreScopeGuard)
@Controller('admin')
export class AdminOrderController {
  constructor(private readonly service: OrderService) {}

  @Delete('orders/:id')
  @HttpCode(204)
  async delete(@Req() req: any, @Param('id') id: string): Promise<void> {
    await this.service.deleteByAdmin(req.user.storeId, id);
  }

  @Get('history')
  history(@Req() req: any, @Query() query: HistoryQueryDto): Promise<OrderHistoryDto[]> {
    return this.service.listHistory(req.user.storeId, query);
  }
}
