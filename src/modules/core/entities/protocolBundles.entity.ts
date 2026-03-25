import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { MedicalCode } from './medicalCode.entity';
import { ProtocolBundleItems } from './protocolBundleItems.entity';

@Entity()
export class ProtocolBundle extends BaseEntity {
  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'uuid' })
  medicalCodeId: string;

  @ManyToOne(() => MedicalCode, (mc) => mc.protocolBundles)
  @JoinColumn({ name: 'medical_code_id' })
  medicalCode: MedicalCode;

  @OneToMany(() => ProtocolBundleItems, (item) => item.bundle)
  items: ProtocolBundleItems[];
}
