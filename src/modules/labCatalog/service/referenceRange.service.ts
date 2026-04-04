import { ReferenceRangeRepository } from '@adapters/repositories/referenceRange.repository';
import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ReferenceRange } from '@modules/core/entities/referenceRange.entity';
import { FindResourceOptions } from '@adapters/repositories/base.repository';

@Injectable()
export class ReferenceRangeService {
  private readonly logger = new Logger(ReferenceRangeService.name);

  constructor(private readonly referenceRangeRepository: ReferenceRangeRepository) {}

  async createReferenceRange(data: Partial<ReferenceRange>, em?: EntityManager) {
    return this.referenceRangeRepository.createReferenceRange(data, em);
  }

  async getReferenceRangeByDataOrFailIfNotExists(
    data: FindResourceOptions<ReferenceRange>,
    em?: EntityManager,
  ) {
    return this.referenceRangeRepository.findOneOrFailIfNotExists(data, em);
  }

  async updateReferenceRange(id: string, data: Partial<ReferenceRange>, em?: EntityManager) {
    return this.referenceRangeRepository.updateReferenceRange(id, data, em);
  }

  async softDeleteReferenceRange(id: string, em?: EntityManager) {
    return this.referenceRangeRepository.softDeleteReferenceRange(id, em);
  }
}
