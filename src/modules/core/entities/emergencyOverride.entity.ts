import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { Patient } from './patient.entity';
import { Episode } from './episode.entity';
import { Staff } from './staff.entity';

export enum EmergencyOverrideScopeEnum {
  CONSULTATION = 'consultation',
  CONSULTATION_EMERGENCY = 'consultation_emergency',
  FULL_VISIT = 'full_visit',
}

export enum EmergencyOverrideStatusEnum {
  ACTIVE = 'active',
  CLEARED = 'cleared',
  EXPIRED = 'expired',
}

@Entity()
export class EmergencyOverride extends BaseEntity {
  @Column({ type: 'uuid' })
  patientId: string;

  @ManyToOne(() => Patient)
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column({ type: 'uuid', nullable: true })
  episodeId: string | null;

  @ManyToOne(() => Episode, { nullable: true })
  @JoinColumn({ name: 'episode_id' })
  episode: Episode | null;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'enum', enum: EmergencyOverrideScopeEnum })
  scope: EmergencyOverrideScopeEnum;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  estimatedAmount: number;

  @Column({ type: 'uuid' })
  authorizedBy: string;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'authorized_by' })
  authorizedByStaff: Staff;

  @Column({ type: 'varchar' })
  authorizedByRole: string;

  @Column({
    type: 'enum',
    enum: EmergencyOverrideStatusEnum,
    default: EmergencyOverrideStatusEnum.ACTIVE,
  })
  status: EmergencyOverrideStatusEnum;

  @Column({ type: 'timestamp with time zone', nullable: true })
  clearedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  clearedBy: string | null;

  @ManyToOne(() => Staff, { nullable: true })
  @JoinColumn({ name: 'cleared_by' })
  clearedByStaff: Staff | null;
}
