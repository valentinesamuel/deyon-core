import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { Patient } from './patient.entity';
import { PatientVital } from './patientVitals.entity';
import { Encounter } from './encounter.entity';
import { Consultation } from './consultation.entity';
import { LabOrder } from './labOrder.entity';
import { Bill } from './bill.entity';
import { EpisodeLog } from './episodeLog.entity';
import { Claim } from './claim.entity';

export enum EpisodeStatusEnum {
  OPEN = 'open',
  CLOSED = 'closed',
  LOCKED = 'locked',
  ARCHIVED = 'archived',
}

@Entity()
export class Episode extends BaseEntity {
  @Column({ type: 'uuid' })
  patientId: string;

  @ManyToOne(() => Patient)
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column({ type: 'varchar', unique: true })
  episodeNumber: string;

  @Column({ type: 'enum', enum: EpisodeStatusEnum })
  status: EpisodeStatusEnum;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  totalBilled: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  totalPaid: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  totalBalance: number;

  @Column({ type: 'boolean', default: false })
  isLockedForAudit: boolean;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => PatientVital, (v) => v.episode)
  vitals: PatientVital[];

  @OneToMany(() => Encounter, (e) => e.episode)
  encounters: Encounter[];

  @OneToMany(() => Consultation, (c) => c.episode)
  consultations: Consultation[];

  @OneToMany(() => LabOrder, (l) => l.episode)
  labOrders: LabOrder[];

  @OneToMany(() => Bill, (b) => b.episode)
  bills: Bill[];

  @OneToMany(() => EpisodeLog, (l) => l.episode)
  logs: EpisodeLog[];

  @OneToMany(() => Claim, (c) => c.episode)
  claims: Claim[];
}
