import { Entity, Column, Index, ManyToOne } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { Staff } from './staff.entity';

export enum AuthEventType {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGIN_LOCKED = 'LOGIN_LOCKED',
  MFA_VERIFIED = 'MFA_VERIFIED',
  MFA_FAILED = 'MFA_FAILED',
  MFA_BACKUP_USED = 'MFA_BACKUP_USED',
  MFA_SETUP = 'MFA_SETUP',
  TOKEN_REFRESHED = 'TOKEN_REFRESHED',
  TOKEN_THEFT_DETECTED = 'TOKEN_THEFT_DETECTED',
  LOGOUT = 'LOGOUT',
  LOGOUT_ALL = 'LOGOUT_ALL',
  PASSWORD_RESET_REQUESTED = 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_COMPLETED = 'PASSWORD_RESET_COMPLETED',
  INVITE_SENT = 'INVITE_SENT',
  INVITE_ACCEPTED = 'INVITE_ACCEPTED',
}

@Entity()
export class AuthAuditLog extends BaseEntity {
  @Column({ type: 'uuid', nullable: true })
  @Index()
  staffId: string;

  @ManyToOne(() => Staff, (staff) => staff.auditLogs)
  staffs: Staff[];

  @Column({ type: 'varchar', enum: AuthEventType })
  event: AuthEventType;

  @Column({ type: 'varchar', nullable: true })
  ipAddress: string;

  @Column({ type: 'varchar', nullable: true })
  userAgent: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @Column({ type: 'boolean', default: true })
  success: boolean;
}
