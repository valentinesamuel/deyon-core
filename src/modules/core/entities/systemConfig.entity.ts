import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';

@Entity('system_config')
export class SystemConfig extends BaseEntity {
  @Column({ type: 'varchar', unique: true })
  key: string;

  @Column({ type: 'jsonb' })
  value: Record<string, unknown>;
}
