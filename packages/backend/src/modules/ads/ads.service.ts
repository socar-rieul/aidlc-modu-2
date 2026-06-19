import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdvertisementDto, AdSlot } from '@table-order/shared';
import { Advertisement } from '../../db/entities/advertisement.entity';

@Injectable()
export class AdsService {
  constructor(@InjectRepository(Advertisement) private readonly repo: Repository<Advertisement>) {}

  async listActive(slot?: AdSlot): Promise<AdvertisementDto[]> {
    const where: any = { active: true };
    if (slot) where.slot = slot;
    const rows = await this.repo.find({ where });
    return rows.map((a) => ({
      id: a.id,
      slot: a.slot,
      imageUrl: a.imageUrl,
      clickUrl: a.clickUrl,
      active: a.active,
    }));
  }
}
