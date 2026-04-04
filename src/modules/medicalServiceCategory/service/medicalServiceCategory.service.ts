import { MedicalServiceCategoryRepository } from '@adapters/repositories/medicalServiceCategory.repository';
import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { MedicalServiceCategory } from '@modules/core/entities/medicalServiceCategory.entity';
import { FindResourceOptions } from '@adapters/repositories/base.repository';

@Injectable()
export class MedicalServiceCategoryService {
  private readonly logger = new Logger(MedicalServiceCategoryService.name);

  constructor(
    private readonly medicalServiceCategoryRepository: MedicalServiceCategoryRepository,
  ) {}

  async createMedicalServiceCategory(data: Partial<MedicalServiceCategory>, em?: EntityManager) {
    return this.medicalServiceCategoryRepository.createMedicalServiceCategory(data, em);
  }

  async getMedicalServiceCategoryByDataOrFailIfNotExists(
    data: FindResourceOptions<MedicalServiceCategory>,
    em?: EntityManager,
  ) {
    return this.medicalServiceCategoryRepository.findOneOrFailIfNotExists(data, em);
  }

  async getMedicalServiceCategoryByDataOrFailIfExists(
    data: FindResourceOptions<MedicalServiceCategory>,
    em?: EntityManager,
  ) {
    return this.medicalServiceCategoryRepository.findOneOrFailIfExists(data, em);
  }

  async updateMedicalServiceCategory(
    id: string,
    data: Partial<MedicalServiceCategory>,
    em?: EntityManager,
  ) {
    return this.medicalServiceCategoryRepository.updateMedicalServiceCategory(id, data, em);
  }
}
