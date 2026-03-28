import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { Episode } from './episode.entity';
import { Staff } from './staff.entity';
import { Consultation } from './consultation.entity';

export enum EncounterTypeEnum {
  TRIAGE = 'triage',
  CONSULTATION = 'consultation',
  LAB = 'lab',
  IMAGING = 'imaging',
  PHARMACY = 'pharmacy',
  DISCHARGE = 'discharge',
}

@Entity()
export class Encounter extends BaseEntity {
  @Column({ type: 'uuid' })
  episodeId: string;

  @ManyToOne(() => Episode, (ep) => ep.encounters)
  @JoinColumn({ name: 'episode_id' })
  episode: Episode;

  @Column({ type: 'enum', enum: EncounterTypeEnum })
  type: EncounterTypeEnum;

  @Column({ type: 'uuid' })
  staffId: string;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'staff_id' })
  staff: Staff;

  @Column({ type: 'jsonb', nullable: true })
  data: Record<string, unknown>;

  @OneToOne(() => Consultation, (c) => c.encounter)
  consultation: Consultation;
}
