import { Entity, Column, ManyToMany } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { Role } from './role.entity';

@Entity()
export class Permission extends BaseEntity {
  @Column({ type: 'varchar', unique: true })
  code: string;

  @Column({ type: 'varchar' })
  description: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @ManyToMany(() => Role, (role) => role.permissions)
  roles: Role[];
}
