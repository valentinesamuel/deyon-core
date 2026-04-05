import { Column, Entity } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';

@Entity()
export class ConflictRule extends BaseEntity {
  @Column({ type: 'varchar' })
  drugNamePattern: string;

  @Column({ type: 'varchar' })
  conflictingLabTestCode: string;

  @Column({ type: 'varchar' })
  conflictingLabResult: string;

  @Column({ type: 'text', nullable: true })
  description: string;
}
