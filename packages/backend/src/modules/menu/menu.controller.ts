import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MenuDto } from '@table-order/shared';
import { MenuService } from './menu.service';
import { QrTokenGuard } from '../../common/guards/qr-token.guard';

@ApiTags('menus')
@UseGuards(QrTokenGuard)
@Controller('menus')
export class MenuController {
  constructor(private readonly service: MenuService) {}

  @Get()
  list(@Req() req: any): Promise<MenuDto[]> {
    return this.service.listForStore(req.session.storeId);
  }
}
