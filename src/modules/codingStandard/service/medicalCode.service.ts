import { MedicalCodeRepository } from '@adapters/repositories/medicalCode.repository';
import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { MedicalCode } from '@modules/core/entities/medicalCode.entity';
import { FindResourceOptions } from '@adapters/repositories/base.repository';

@Injectable()
export class MedicalCodeService {
  private readonly logger = new Logger(MedicalCodeService.name);

  constructor(private readonly medicalCodeRepository: MedicalCodeRepository) {}

  async createMedicalCode(data: Partial<MedicalCode>, em?: EntityManager) {
    return this.medicalCodeRepository.createMedicalCode(data, em);
  }

  async getMedicalCodeByDataOrFailIfNotExists(
    data: FindResourceOptions<MedicalCode>,
    em?: EntityManager,
  ) {
    return this.medicalCodeRepository.findOneOrFailIfNotExists(data, em);
  }

  async updateMedicalCode(id: string, data: Partial<MedicalCode>, em?: EntityManager) {
    return this.medicalCodeRepository.updateMedicalCode(id, data, em);
  }

  async softDeleteMedicalCode(id: string, em?: EntityManager) {
    return this.medicalCodeRepository.softDeleteMedicalCode(id, em);
  }
}
