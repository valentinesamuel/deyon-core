import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { MedicalCode } from './medicalCode.entity';
import { MedicalService } from './medicalService.entity';
import { HmoProvider } from './hmoProvider.entity';
import { LabOrderItem } from './labOrderItem.entity';
import { TestCatalog } from './testCatalog.entity';

@Entity()
export class ServiceCodeCatalog extends BaseEntity {
  @Column({ type: 'uuid' })
  medicalCodeId: string;

  @ManyToOne(() => MedicalCode, (mc) => mc.serviceCodeCatalogs)
  @JoinColumn({ name: 'medical_code_id' })
  medicalCode: MedicalCode;

  @Column({ type: 'uuid' })
  serviceId: string;

  @ManyToOne(() => MedicalService, (s) => s.serviceCodeCatalogs)
  @JoinColumn({ name: 'service_id' })
  service: MedicalService;

  @Column({ type: 'uuid', nullable: true })
  hmoProviderId: string;

  @ManyToOne(() => HmoProvider, { nullable: true })
  @JoinColumn({ name: 'hmo_provider_id' })
  hmoProvider: HmoProvider;

  @OneToMany(() => LabOrderItem, (item) => item.serviceCode)
  labOrderItems: LabOrderItem[];

  @OneToOne(() => TestCatalog, (t) => t.serviceCode)
  testCatalog: TestCatalog;
}
