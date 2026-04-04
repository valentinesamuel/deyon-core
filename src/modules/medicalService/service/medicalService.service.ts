import { MedicalServiceRepository } from '@adapters/repositories/medicalService.repository';
import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { MedicalService } from '@modules/core/entities/medicalService.entity';
import { FindResourceOptions } from '@adapters/repositories/base.repository';

@Injectable()
export class MedicalServiceService {
  private readonly logger = new Logger(MedicalServiceService.name);

  constructor(private readonly medicalServiceRepository: MedicalServiceRepository) {}

  async createMedicalService(data: Partial<MedicalService>, em?: EntityManager) {
    return this.medicalServiceRepository.createMedicalService(data, em);
  }

  async getMedicalServiceByDataOrFailIfNotExists(
    data: FindResourceOptions<MedicalService>,
    em?: EntityManager,
  ) {
    return this.medicalServiceRepository.findOneOrFailIfNotExists(data, em);
  }

  async getMedicalServiceByDataOrFailIfExists(
    data: FindResourceOptions<MedicalService>,
    em?: EntityManager,
  ) {
    return this.medicalServiceRepository.findOneOrFailIfExists(data, em);
  }

  async updateMedicalService(id: string, data: Partial<MedicalService>, em?: EntityManager) {
    return this.medicalServiceRepository.updateMedicalService(id, data, em);
  }
}
