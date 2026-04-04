import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { Staff } from './staff.entity';

@Entity()
export class StaffPermissionOverride extends BaseEntity {
  @Column({ type: 'uuid' })
  @Index()
  staffId: string;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'staff_id' })
  staff: Staff;

  /** The permission code string (e.g. 'billing:create') */
  @Column({ type: 'varchar' })
  @Index()
  permissionCode: string;

  /** true = explicitly granted; false = explicitly revoked */
  @Column({ type: 'boolean' })
  granted: boolean;

  @Column({ type: 'uuid' })
  grantedBy: string;

  @ManyToOne(() => Staff)
  @JoinColumn({ name: 'granted_by' })
  grantedByStaff: Staff;

  @Column({ type: 'timestamp with time zone' })
  grantedAt: Date;
}
