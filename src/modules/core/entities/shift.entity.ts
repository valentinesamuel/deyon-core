import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { Staff } from './staff.entity';
import { Department } from './department.entity';
import { Payment } from './payment.entity';
import { Bill } from './bill.entity';

export enum ShiftStatusEnum {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum ShiftStationEnum {
  RECEPTION = 'reception',
  LAB = 'lab',
  PHARMACY = 'pharmacy',
  NURSING_STATION = 'nursing_station',
  IMAGING = 'imaging',
  TRIAGE = 'triage',
}

@Entity()
export class Shift extends BaseEntity {
  @Column({ type: 'uuid' })
  staffId: string;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'staff_id' })
  staff: Staff;

  @Column({ type: 'enum', enum: ShiftStatusEnum })
  status: ShiftStatusEnum;

  @Column({ type: 'enum', enum: ShiftStationEnum })
  station: ShiftStationEnum;

  @Column({ type: 'timestamp with time zone' })
  startedAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  endedAt: Date;

  @Column({ type: 'uuid' })
  departmentId: string;

  @ManyToOne(() => Department)
  @JoinColumn({ name: 'department_id' })
  department: Department;

  @OneToMany(() => Payment, (p) => p.shift)
  payments: Payment[];

  @OneToMany(() => Bill, (b) => b.shift)
  bills: Bill[];
}
