import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TableSession } from './table-session.entity';

@Entity('session_participants')
@Index(['token'], { unique: true })
@Index(['sessionId', 'revokedAt'])
export class SessionParticipant {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column() sessionId!: string;
  @ManyToOne(() => TableSession, (s) => s.participants, { onDelete: 'CASCADE' }) session!: TableSession;
  @Column() token!: string;
  @CreateDateColumn() joinedAt!: Date;
  @Column({ type: 'datetime', nullable: true }) revokedAt!: Date | null;
}
