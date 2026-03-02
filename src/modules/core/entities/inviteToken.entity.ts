import { Entity, Column, ManyToOne } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { Department } from './department.entity';

@Entity()
export class InviteToken extends BaseEntity {
  @Column({ type: 'varchar', unique: true })
  tokenHash: string;

  @Column({ type: 'varchar' })
  email: string;

  @Column({ type: 'uuid', nullable: true })
  roleId: string;

  @Column({ type: 'uuid', nullable: true })
  departmentId: string;

  @ManyToOne(() => Department)
  department: Department;

  @Column({ type: 'timestamp with time zone' })
  expiresAt: Date;

  @Column({ type: 'boolean', default: false })
  isUsed: boolean;

  @Column({ type: 'uuid', nullable: true })
  invitedById: string;
}
