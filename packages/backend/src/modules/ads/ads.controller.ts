import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdsQueryDto, AdvertisementDto } from '@table-order/shared';
import { AdsService } from './ads.service';
import { QrTokenGuard } from '../../common/guards/qr-token.guard';

@ApiTags('ads')
@UseGuards(QrTokenGuard)
@Controller('ads')
export class AdsController {
  constructor(private readonly service: AdsService) {}

  @Get()
  list(@Query() q: AdsQueryDto): Promise<AdvertisementDto[]> {
    return this.service.listActive(q.slot);
  }
}
