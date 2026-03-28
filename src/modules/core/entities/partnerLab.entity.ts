import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '@shared/repositories/base.entity';
import { LabReferral } from './labReferral.entity';

export enum PartnerLabStatusEnum {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity()
export class PartnerLab extends BaseEntity {
  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', unique: true })
  code: string;

  @Column({ type: 'varchar', nullable: true })
  address: string;

  @Column({ type: 'enum', enum: PartnerLabStatusEnum, default: PartnerLabStatusEnum.ACTIVE })
  status: PartnerLabStatusEnum;

  @Column({ type: 'varchar' })
  contactPhone: string;

  @Column({ type: 'jsonb' })
  specializations: string[];

  @Column({ type: 'varchar', nullable: true })
  contactEmail: string;

  @OneToMany(() => LabReferral, (r) => r.partnerLab)
  referrals: LabReferral[];
}
