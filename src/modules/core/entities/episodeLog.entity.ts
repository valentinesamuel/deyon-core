import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { Episode } from './episode.entity';

export enum EpisodeLogActorTypeEnum {
  STAFF = 'staff',
  PATIENT = 'patient',
  SYSTEM = 'system',
}

export enum EpisodeEventTypeEnum {
  EPISODE_OPENED = 'episode_opened',
  EPISODE_CLOSED = 'episode_closed',
  EPISODE_LOCKED = 'episode_locked',
  VITALS_RECORDED = 'vitals_recorded',
  CONSULTATION_STARTED = 'consultation_started',
  CONSULTATION_COMPLETED = 'consultation_completed',
  LAB_ORDERED = 'lab_ordered',
  LAB_RESULTED = 'lab_resulted',
  PRESCRIPTION_ISSUED = 'prescription_issued',
  PRESCRIPTION_DISPENSED = 'prescription_dispensed',
  BILL_CREATED = 'bill_created',
  PAYMENT_RECEIVED = 'payment_received',
  CLAIM_SUBMITTED = 'claim_submitted',
}

@Entity()
export class EpisodeLog extends BaseEntity {
  @Column({ type: 'uuid' })
  episodeId: string;

  @ManyToOne(() => Episode, (ep) => ep.logs)
  @JoinColumn({ name: 'episode_id' })
  episode: Episode;

  @Column({ type: 'enum', enum: EpisodeEventTypeEnum })
  eventType: EpisodeEventTypeEnum;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'uuid', nullable: true })
  actorId: string;

  @Column({ type: 'enum', enum: EpisodeLogActorTypeEnum })
  actorType: EpisodeLogActorTypeEnum;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;
}
