import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreateMenuDto, MenuDto, MenuSortDto, SoldoutToggleDto, UpdateMenuDto } from '@table-order/shared';
import { MenuService } from './menu.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { StoreScopeGuard } from '../../common/guards/store-scope.guard';

@ApiTags('admin/menus')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, StoreScopeGuard)
@Controller('admin/menus')
export class AdminMenuController {
  constructor(private readonly service: MenuService) {}

  @Get()
  list(@Req() req: any): Promise<MenuDto[]> {
    return this.service.listForStore(req.user.storeId);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateMenuDto): Promise<MenuDto> {
    return this.service.create(req.user.storeId, dto);
  }

  @Patch('sort')
  reorder(@Req() req: any, @Body() dto: MenuSortDto): Promise<MenuDto[]> {
    return this.service.reorder(req.user.storeId, dto.ids);
  }

  @Patch(':id/soldout')
  toggleSoldout(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: SoldoutToggleDto,
  ): Promise<MenuDto> {
    return this.service.toggleSoldout(req.user.storeId, id, dto);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateMenuDto): Promise<MenuDto> {
    return this.service.update(req.user.storeId, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async delete(@Req() req: any, @Param('id') id: string): Promise<void> {
    await this.service.delete(req.user.storeId, id);
  }
}
