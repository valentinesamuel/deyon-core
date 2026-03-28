import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { HmoProvider } from './hmoProvider.entity';
import { MedicalService } from './medicalService.entity';

@Entity()
export class HmoRules extends BaseEntity {
  @Column({ type: 'uuid' })
  hmoProviderId: string;

  @ManyToOne(() => HmoProvider)
  @JoinColumn({ name: 'hmo_provider_id' })
  hmoProvider: HmoProvider;

  @Column({ type: 'uuid' })
  triggerServiceId: string;

  @ManyToOne(() => MedicalService, (s) => s.hmoRules)
  @JoinColumn({ name: 'trigger_service_id' })
  triggerService: MedicalService;

  @Column({ type: 'jsonb' })
  logic: Record<string, unknown>[];

  @Column({ type: 'varchar' })
  errorMessage: string;
}
