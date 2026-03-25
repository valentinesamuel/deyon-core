import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { MedicalCode } from './medicalCode.entity';

@Entity()
export class CodingStandard extends BaseEntity {
  @Column({ type: 'varchar', unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @OneToMany(() => MedicalCode, (mc) => mc.standard)
  medicalCodes: MedicalCode[];
}
