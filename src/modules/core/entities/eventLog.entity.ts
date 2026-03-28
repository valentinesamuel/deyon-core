import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';

export enum EventType {
  HMO_PROVIDER_CREATED = 'HMO_PROVIDER_CREATED',
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
  ROLE_CREATED = 'ROLE_CREATED',
  ROLE_UPDATED = 'ROLE_UPDATED',
  ROLE_DELETED = 'ROLE_DELETED',
  STAFF_ROLE_REASSIGNED = 'STAFF_ROLE_REASSIGNED',
  CMO_REGISTERED = 'CMO_REGISTERED',
  SETUP_COMPLETED = 'SETUP_COMPLETED',
}

export enum EventModule {
  AUTH = 'permissions',
  SETUP = 'setup',
  HMO_PROVIDER = 'hmo_provider',
}

@Entity()
export class EventLog extends BaseEntity {
  @Column({ type: 'uuid', nullable: true })
  @Index()
  actorId: string | null;

  @Column({ type: 'varchar' })
  event: EventType;

  @Column({ type: 'varchar', nullable: true })
  module: EventModule | null;

  @Column({ type: 'varchar', nullable: true })
  ipAddress: string;

  @Column({ type: 'varchar', nullable: true })
  userAgent: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @Column({ type: 'boolean', default: true })
  success: boolean;
}
