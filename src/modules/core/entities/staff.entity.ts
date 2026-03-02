import { BaseEntity } from '@shared/repositories/base.entity';
import { Entity, Column, ManyToOne, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { Department } from './department.entity';
import { Role } from './role.entity';
import { RefreshToken } from '@modules/core/entities/refreshToken.entity';
import { MfaConfig } from '@modules/core/entities/mfaConfig.entity';
import { AuthAuditLog } from '@modules/core/entities/authAuditLog.entity';

@Entity()
export class Staff extends BaseEntity {
  @Column({ type: 'varchar' })
  firstName: string;

  @Column({ type: 'varchar' })
  lastName: string;

  @Column({ type: 'varchar', unique: true })
  email: string;

  @Column({ type: 'varchar', unique: true })
  phoneNumber: string;

  @Column({ type: 'varchar', nullable: true, unique: true })
  licenseNumber: string;

  @Column({ type: 'varchar', nullable: true })
  specialization: string;

  @Column({ type: 'boolean', default: false })
  isApproved: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  lastLogin: Date;

  @Column({ type: 'boolean', default: false })
  isActive: boolean;

  // Auth columns
  @Column({ type: 'varchar', nullable: true, select: false })
  passwordHash: string;

  @Column({ type: 'int', default: 0 })
  failedLoginAttempts: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  lockedUntil: Date;

  @Column({ type: 'boolean', default: false })
  passwordMustChange: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  lastPasswordChange: Date;

  @Column({ type: 'boolean', default: false })
  mfaEnabled: boolean;

  @Column({ type: 'uuid', nullable: true })
  roleId: string;

  @ManyToOne(() => Role, (role) => role.staffs)
  @JoinColumn({ name: 'role_id', referencedColumnName: 'id' })
  role: Role;

  @Column({ type: 'uuid', nullable: true })
  departmentId: string;

  @ManyToOne(() => Department, (department) => department.staffs)
  @JoinColumn({ name: 'department_id', referencedColumnName: 'id' })
  department: Department;

  @OneToMany(() => RefreshToken, (token) => token.staff)
  refreshTokens: RefreshToken[];

  @OneToOne(() => MfaConfig, (mfa) => mfa.staff)
  mfaConfig: MfaConfig;

  @OneToMany(() => AuthAuditLog, (log) => log.staffId)
  auditLogs: AuthAuditLog[];
}
