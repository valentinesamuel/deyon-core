import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { Patient } from './patient.entity';
import { Staff } from './staff.entity';
import { Episode } from './episode.entity';
import { Encounter } from './encounter.entity';
import { LabOrderItem } from './labOrderItem.entity';
export { LabOrderTypeEnum, LabOrderStatusEnum, LabPriorityEnum } from './labOrder.enums';
import { LabOrderTypeEnum, LabOrderStatusEnum, LabPriorityEnum } from './labOrder.enums';

@Entity()
export class LabOrder extends BaseEntity {
  @Column({ type: 'uuid' })
  patientId: string;

  @ManyToOne(() => Patient)
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column({ type: 'uuid' })
  doctorId: string;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'doctor_id' })
  doctor: Staff;

  @Column({ type: 'uuid', nullable: true })
  episodeId: string;

  @ManyToOne(() => Episode, (ep) => ep.labOrders, { nullable: true })
  @JoinColumn({ name: 'episode_id' })
  episode: Episode;

  @Column({ type: 'uuid', nullable: true })
  encounterId: string;

  @ManyToOne(() => Encounter, { nullable: true })
  @JoinColumn({ name: 'encounter_id' })
  encounter: Encounter;

  @Column({ type: 'enum', enum: LabOrderTypeEnum })
  type: LabOrderTypeEnum;

  @Column({ type: 'enum', enum: LabOrderStatusEnum, default: LabOrderStatusEnum.PENDING })
  status: LabOrderStatusEnum;

  @Column({ type: 'enum', enum: LabPriorityEnum, default: LabPriorityEnum.ROUTINE })
  priority: LabPriorityEnum;

  @Column({ type: 'timestamp with time zone', nullable: true })
  collectedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  processedBy: string;

  @ManyToOne(() => Staff, { nullable: true })
  @JoinColumn({ name: 'processed_by' })
  processedByStaff: Staff;

  @Column({ type: 'timestamp with time zone', nullable: true })
  completedAt: Date;

  @OneToMany(() => LabOrderItem, (item) => item.labOrder)
  items: LabOrderItem[];
}
