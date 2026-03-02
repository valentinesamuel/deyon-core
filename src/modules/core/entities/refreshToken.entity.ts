import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { Staff } from '@modules/core/entities/staff.entity';

@Entity()
export class RefreshToken extends BaseEntity {
  @Column({ type: 'varchar' })
  tokenHash: string;

  @Column({ type: 'uuid' })
  staffId: string;

  @ManyToOne(() => Staff, (staff) => staff.refreshTokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'staff_id', referencedColumnName: 'id' })
  staff: Staff;

  @Column({ type: 'uuid' })
  @Index()
  familyId: string;

  @Column({ type: 'timestamp with time zone' })
  expiresAt: Date;

  @Column({ type: 'boolean', default: false })
  isRevoked: boolean;

  @Column({ type: 'varchar', nullable: true })
  userAgent: string;

  @Column({ type: 'varchar', nullable: true })
  ipAddress: string;
}
