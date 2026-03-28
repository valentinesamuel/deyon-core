import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { StaffShiftSchedule } from './staffShiftSchedule.entity';

export enum DayOfWeekEnum {
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
  SUNDAY = 'sunday',
}

export enum ShiftTimeOfDayEnum {
  MORNING = 'morning',
  AFTERNOON = 'afternoon',
  NIGHT = 'night',
}

@Entity()
export class ShiftSchedule extends BaseEntity {
  @Column({ type: 'enum', enum: ShiftTimeOfDayEnum })
  timeOfDay: ShiftTimeOfDayEnum;

  @Column({ type: 'time' })
  startTime: string;

  @Column({ type: 'time' })
  endTime: string;

  @Column({ type: 'enum', enum: DayOfWeekEnum })
  day: DayOfWeekEnum;

  @OneToMany(() => StaffShiftSchedule, (s) => s.shiftSchedule)
  staffShiftSchedules: StaffShiftSchedule[];
}
