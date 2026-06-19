import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SseService } from './sse.service';
import { SseEventRouter } from './sse.event-router';
import { SseController } from './sse.controller';
import { SessionParticipant } from '../../db/entities/session-participant.entity';
import { TableSession } from '../../db/entities/table-session.entity';
import { Table } from '../../db/entities/table.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SessionParticipant, TableSession, Table])],
  providers: [SseService, SseEventRouter],
  controllers: [SseController],
  exports: [SseService],
})
export class SseModule {}
