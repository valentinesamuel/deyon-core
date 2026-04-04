import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { BaseRepository } from './base.repository';
import { BillingCode } from '@modules/core/entities/billingCode.entity';
import { MedicalServiceDepartmentEnum } from '@modules/core/entities/medicalService.entity';

// Department prefix lookup
const DEPT_PREFIXES: Record<MedicalServiceDepartmentEnum, string> = {
  [MedicalServiceDepartmentEnum.PHARMACY]: 'PHM',
  [MedicalServiceDepartmentEnum.LAB]: 'LAB',
  [MedicalServiceDepartmentEnum.NURSING]: 'NRS',
  [MedicalServiceDepartmentEnum.FRONT_DESK]: 'FDK',
  [MedicalServiceDepartmentEnum.ALL]: 'GEN',
};

@Injectable()
export class BillingCodeRepository extends BaseRepository<BillingCode> {
  private readonly logger = new Logger(BillingCodeRepository.name);

  constructor(@InjectRepository(BillingCode) private readonly repo: Repository<BillingCode>) {
    super(repo.target, repo.manager, repo.queryRunner);
  }

  createBillingCode(data: Partial<BillingCode>, em?: EntityManager): Promise<BillingCode> {
    const repo = em ? em.getRepository(BillingCode) : this;
    const code = repo.create(data);
    return repo.save(code);
  }

  async generateCode(department: MedicalServiceDepartmentEnum, em: EntityManager): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = DEPT_PREFIXES[department] ?? 'GEN';
    const result = await em.query(`SELECT nextval('billing_code_seq') AS seq`);
    const seq = String(result[0].seq).padStart(6, '0');
    return `${prefix}-${year}-${seq}`;
  }
}
