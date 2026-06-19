import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CreateTableDto, QrRegenerateResponse, TableDto } from '@table-order/shared';
import { TableService } from './table.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { StoreScopeGuard } from '../../common/guards/store-scope.guard';

@ApiTags('admin/tables')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, StoreScopeGuard)
@Controller('admin/tables')
export class AdminTableController {
  constructor(private readonly service: TableService) {}

  @Get()
  list(@Req() req: any): Promise<TableDto[]> {
    return this.service.listTables(req.user.storeId);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateTableDto): Promise<TableDto> {
    return this.service.createTable(req.user.storeId, dto);
  }

  @Post(':id/qr/regenerate')
  regenerate(@Req() req: any, @Param('id') id: string): Promise<QrRegenerateResponse> {
    return this.service.regenerateQr(req.user.storeId, id);
  }

  @Post(':id/session/close')
  closeSession(@Req() req: any, @Param('id') id: string): Promise<{ closedSessionId: string; movedOrders: number }> {
    return this.service.closeActiveSession(req.user.storeId, id);
  }

  @Get(':id/qr.png')
  async qrPng(@Req() req: any, @Param('id') id: string, @Res() res: Response): Promise<void> {
    const buf = (await this.service.generateQrImage(id, 'png', req.user.storeId)) as Buffer;
    res.setHeader('Content-Type', 'image/png');
    res.send(buf);
  }

  @Get(':id/qr.svg')
  async qrSvg(@Req() req: any, @Param('id') id: string, @Res() res: Response): Promise<void> {
    const svg = (await this.service.generateQrImage(id, 'svg', req.user.storeId)) as string;
    res.setHeader('Content-Type', 'image/svg+xml');
    res.send(svg);
  }
}
