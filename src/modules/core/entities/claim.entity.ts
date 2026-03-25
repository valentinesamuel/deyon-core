import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { Episode } from './episode.entity';
import { HmoProvider } from './hmoProvider.entity';
import { Bill } from './bill.entity';

export enum ClaimStatusEnum {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  PROCESSING = 'processing',
  APPROVED = 'approved',
  DENIED = 'denied',
  PAID = 'paid',
  WITHDRAWN = 'withdrawn',
  RETRACTED = 'retracted',
}

@Entity()
export class Claim extends BaseEntity {
  @Column({ type: 'uuid' })
  episodeId: string;

  @ManyToOne(() => Episode, (ep) => ep.claims)
  @JoinColumn({ name: 'episode_id' })
  episode: Episode;

  @Column({ type: 'uuid' })
  hmoProviderId: string;

  @ManyToOne(() => HmoProvider)
  @JoinColumn({ name: 'hmo_provider_id' })
  hmoProvider: HmoProvider;

  @Column({ type: 'enum', enum: ClaimStatusEnum, default: ClaimStatusEnum.DRAFT })
  status: ClaimStatusEnum;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  totalBilledAmount: number;

  @Column({ type: 'varchar' })
  primaryDiagnosisCode: string;

  @Column({ type: 'jsonb', nullable: true })
  attachments: Record<string, unknown>[];

  @OneToMany(() => Bill, (b) => b.claim)
  bills: Bill[];
}
