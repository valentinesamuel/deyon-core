import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';

@Entity()
export class HmoProvider extends BaseEntity {
  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', unique: true })
  @Index()
  code: string;

  @Column({ type: 'varchar' })
  contactPhone: string;

  @Column({ type: 'varchar' })
  contactEmail: string;

  @Column({ type: 'varchar' })
  address: string;

  @Column({ type: 'numeric', scale: 2, precision: 10 })
  defaultCopay: string;

  @Column({ type: 'integer' })
  defaultCopayPercentage: number;

  @Column({ type: 'boolean' })
  isActive: boolean;

  @Column({ type: 'varchar' })
  portalUrl: string;

  @Column({ type: 'varchar' })
  claimsEmail: string;

  @Column({ type: 'varchar' })
  retractionEmail: string;

  @Column({ type: 'varchar', nullable: true })
  relationshipManagerPhone: string;
}
