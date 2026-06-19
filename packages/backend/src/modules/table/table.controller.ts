import { Controller, Headers, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { QrScanResponse } from '@table-order/shared';
import { TableService } from './table.service';

@ApiTags('qr')
@Controller('qr')
export class TableController {
  constructor(private readonly service: TableService) {}

  @Post('scan/:token')
  scan(
    @Param('token') token: string,
    @Headers('x-session-token') existingToken?: string,
  ): Promise<QrScanResponse> {
    return this.service.scanQr(token, existingToken);
  }
}
