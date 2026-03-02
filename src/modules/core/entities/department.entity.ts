import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { Staff } from './staff.entity';

@Entity()
export class Department extends BaseEntity {
  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  alias: string;

  @OneToMany(() => Staff, (staff) => staff.department)
  staffs: Staff[];
}
