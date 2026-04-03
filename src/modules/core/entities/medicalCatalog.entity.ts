import { Column, Entity } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';

@Entity()
export class MedicalCatalog extends BaseEntity {
  @Column({ type: 'varchar' })
  type: string;

  @Column({ type: 'varchar' })
  officialName: string;

  @Column({ type: 'varchar' })
  code: string;

  @Column({ type: 'jsonb', nullable: true })
  searchKeywords: string[];

  @Column({ type: 'boolean', default: false })
  isVerified: boolean;
}
