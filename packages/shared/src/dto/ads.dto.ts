import { IsEnum, IsOptional } from 'class-validator';
import { AdSlot } from '../enums/ad-slot.enum';

export class AdvertisementDto {
  id!: string;
  slot!: AdSlot;
  imageUrl!: string;
  clickUrl!: string;
  active!: boolean;
}

export class AdsQueryDto {
  @IsOptional() @IsEnum(AdSlot) slot?: AdSlot;
}
