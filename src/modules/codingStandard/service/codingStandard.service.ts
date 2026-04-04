import { CodingStandardRepository } from '@adapters/repositories/codingStandard.repository';
import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { CodingStandard } from '@modules/core/entities/codingStandard.entity';
import { FindResourceOptions } from '@adapters/repositories/base.repository';

@Injectable()
export class CodingStandardService {
  private readonly logger = new Logger(CodingStandardService.name);

  constructor(private readonly codingStandardRepository: CodingStandardRepository) {}

  async createCodingStandard(data: Partial<CodingStandard>, em?: EntityManager) {
    return this.codingStandardRepository.createCodingStandard(data, em);
  }

  async getCodingStandardByDataOrFailIfNotExists(
    data: FindResourceOptions<CodingStandard>,
    em?: EntityManager,
  ) {
    return this.codingStandardRepository.findOneOrFailIfNotExists(data, em);
  }

  async getCodingStandardByDataOrFailIfExists(
    data: FindResourceOptions<CodingStandard>,
    em?: EntityManager,
  ) {
    return this.codingStandardRepository.findOneOrFailIfExists(data, em);
  }

  async updateCodingStandard(id: string, data: Partial<CodingStandard>, em?: EntityManager) {
    return this.codingStandardRepository.updateCodingStandard(id, data, em);
  }
}
