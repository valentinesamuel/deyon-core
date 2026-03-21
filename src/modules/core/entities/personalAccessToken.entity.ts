import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { Staff } from '@modules/core/entities/staff.entity';

@Entity()
export class PersonalAccessToken extends BaseEntity {
  @Column({ type: 'varchar', unique: true })
  @Index()
  tokenHash: string;

  @Column({ type: 'uuid' })
  @Index()
  staffId: string;

  @ManyToOne(() => Staff, (staff) => staff.personalAccessTokens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'staff_id', referencedColumnName: 'id' })
  staff: Staff;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'boolean', default: false })
  isRevoked: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  lastUsedAt: Date | null;
}
