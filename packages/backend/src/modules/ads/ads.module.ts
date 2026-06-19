import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Advertisement } from '../../db/entities/advertisement.entity';
import { AdsService } from './ads.service';
import { AdsController } from './ads.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Advertisement])],
  providers: [AdsService],
  controllers: [AdsController],
})
export class AdsModule {}
