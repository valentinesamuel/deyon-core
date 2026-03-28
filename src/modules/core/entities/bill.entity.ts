import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { Patient } from './patient.entity';
import { Shift } from './shift.entity';
import { Encounter } from './encounter.entity';
import { Episode } from './episode.entity';
import { Claim } from './claim.entity';
import { Department } from './department.entity';
import { Staff } from './staff.entity';
import { BillItem } from './billItem.entity';
import { Payment } from './payment.entity';

export enum BillTypeEnum {
  WALK_IN = 'walk_in',
  EPISODE = 'episode',
}

export enum BillStatusEnum {
  PENDING = 'pending',
  PARTIAL = 'partial',
  PAID = 'paid',
  WAIVED = 'waived',
  REFUNDED = 'refunded',
}

@Entity()
export class Bill extends BaseEntity {
  @Column({ type: 'varchar', unique: true })
  billNumber: string;

  @Column({ type: 'varchar', nullable: true })
  code: string;

  @Column({ type: 'uuid' })
  patientId: string;

  @ManyToOne(() => Patient)
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column({ type: 'uuid', nullable: true })
  shiftId: string;

  @ManyToOne(() => Shift, (s) => s.bills, { nullable: true })
  @JoinColumn({ name: 'shift_id' })
  shift: Shift;

  @Column({ type: 'uuid', nullable: true })
  encounterId: string;

  @ManyToOne(() => Encounter, { nullable: true })
  @JoinColumn({ name: 'encounter_id' })
  encounter: Encounter;

  @Column({ type: 'enum', enum: BillTypeEnum })
  type: BillTypeEnum;

  @Column({ type: 'enum', enum: BillStatusEnum, default: BillStatusEnum.PENDING })
  status: BillStatusEnum;

  @Column({ type: 'uuid', nullable: true })
  episodeId: string;

  @ManyToOne(() => Episode, (ep) => ep.bills, { nullable: true })
  @JoinColumn({ name: 'episode_id' })
  episode: Episode;

  @Column({ type: 'uuid', nullable: true })
  claimId: string;

  @ManyToOne(() => Claim, (c) => c.bills, { nullable: true })
  @JoinColumn({ name: 'claim_id' })
  claim: Claim;

  @Column({ type: 'uuid' })
  departmentId: string;

  @ManyToOne(() => Department)
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @Column({ type: 'uuid' })
  createdBy: string;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'created_by' })
  createdByStaff: Staff;

  @OneToMany(() => BillItem, (item) => item.bill)
  items: BillItem[];

  @OneToMany(() => Payment, (p) => p.bill)
  payments: Payment[];
}
