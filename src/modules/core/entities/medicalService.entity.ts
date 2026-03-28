import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { MedicalServiceCategory } from './medicalServiceCategory.entity';
import { BillItem } from './billItem.entity';
import { HmoContract } from './hmoContract.entity';
import { PriceChange } from './priceChange.entity';
import { HmoRules } from './hmoRules.entity';
import { ServiceCodeCatalog } from './serviceCodeCatalog.entity';

@Entity()
export class MedicalService extends BaseEntity {
  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'uuid' })
  medicalServiceCategoryId: string;

  @ManyToOne(() => MedicalServiceCategory, (c) => c.services)
  @JoinColumn({ name: 'medical_service_category_id' })
  medicalServiceCategory: MedicalServiceCategory;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  defaultPrice: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => BillItem, (item) => item.service)
  billItems: BillItem[];

  @OneToMany(() => HmoContract, (c) => c.service)
  hmoContracts: HmoContract[];

  @OneToMany(() => PriceChange, (p) => p.service)
  priceChanges: PriceChange[];

  @OneToMany(() => HmoRules, (r) => r.triggerService)
  hmoRules: HmoRules[];

  @OneToMany(() => ServiceCodeCatalog, (s) => s.service)
  serviceCodeCatalogs: ServiceCodeCatalog[];
}
