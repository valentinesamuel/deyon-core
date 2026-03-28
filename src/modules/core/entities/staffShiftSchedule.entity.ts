import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { ShiftSchedule } from './shiftSchedule.entity';
import { Staff } from './staff.entity';

@Entity()
export class StaffShiftSchedule extends BaseEntity {
  @Column({ type: 'uuid' })
  shiftScheduleId: string;

  @ManyToOne(() => ShiftSchedule, (s) => s.staffShiftSchedules)
  @JoinColumn({ name: 'shift_schedule_id' })
  shiftSchedule: ShiftSchedule;

  @Column({ type: 'uuid' })
  staffId: string;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'staff_id' })
  staff: Staff;
}
