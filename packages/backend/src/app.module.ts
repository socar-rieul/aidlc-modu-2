import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildDataSourceOptions } from './db/data-source';
import { CommonModule } from './common/common.module';
import { AuthModule } from './modules/auth/auth.module';
import { StoreModule } from './modules/store/store.module';
import { TableModule } from './modules/table/table.module';
import { MenuModule } from './modules/menu/menu.module';
import { CartModule } from './modules/cart/cart.module';
import { OrderModule } from './modules/order/order.module';
import { SseModule } from './modules/sse/sse.module';
import { AdsModule } from './modules/ads/ads.module';
import { AdminModule } from './modules/admin/admin.module';
import { SeedModule } from './seed/seed.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    TypeOrmModule.forRoot(buildDataSourceOptions()),
    EventEmitterModule.forRoot(),
    CommonModule,
    AuthModule,
    StoreModule,
    TableModule,
    MenuModule,
    CartModule,
    OrderModule,
    SseModule,
    AdsModule,
    AdminModule,
    SeedModule,
  ],
})
export class AppModule {}
