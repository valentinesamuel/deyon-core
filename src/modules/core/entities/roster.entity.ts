import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { Staff } from './staff.entity';
import { StaffShiftSchedule } from './staffShiftSchedule.entity';

export enum RosterStatusEnum {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

@Entity()
export class Roster extends BaseEntity {
  @Column({ type: 'date' })
  weekStartDate: string;

  @Column({ type: 'enum', enum: RosterStatusEnum, default: RosterStatusEnum.DRAFT })
  status: RosterStatusEnum;

  @Column({ type: 'timestamp with time zone', nullable: true })
  publishedAt: Date;

  @Column({ type: 'uuid', nullable: true })
  publishedById: string;

  @ManyToOne(() => Staff, { nullable: true })
  @JoinColumn({ name: 'published_by_id' })
  publishedBy: Staff;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @OneToMany(() => StaffShiftSchedule, (s) => s.roster)
  assignments: StaffShiftSchedule[];
}
