import { Entity, Column, OneToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { Staff } from '@modules/core/entities/staff.entity';

@Entity()
export class MfaConfig extends BaseEntity {
  @Column({ type: 'uuid', unique: true })
  staffId: string;

  @OneToOne(() => Staff, (staff) => staff.mfaConfig, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'staff_id', referencedColumnName: 'id' })
  staff: Staff;

  @Column({ type: 'varchar', select: false })
  encryptedSecret: string;

  @Column({ type: 'text', select: false, nullable: true })
  backupCodeHashes: string;

  @Column({ type: 'text', nullable: true })
  usedBackupCodes: string;
}
