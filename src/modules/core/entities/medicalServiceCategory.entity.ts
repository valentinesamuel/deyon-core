import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { MedicalService } from './medicalService.entity';

@Entity()
export class MedicalServiceCategory extends BaseEntity {
  @Column({ type: 'varchar', unique: true })
  name: string;

  @OneToMany(() => MedicalService, (s) => s.medicalServiceCategory)
  services: MedicalService[];
}
