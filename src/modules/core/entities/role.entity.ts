import { Entity, Column, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { Staff } from './staff.entity';
import { Permission } from './permission.entity';

@Entity()
export class Role extends BaseEntity {
  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  alias: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'boolean', default: false })
  isSystemRole: boolean;

  @OneToMany(() => Staff, (staff) => staff.role)
  staffs: Staff[];

  @ManyToMany(() => Permission, (permission) => permission.roles)
  @JoinTable({ name: 'role_permission' })
  permissions: Permission[];
}
