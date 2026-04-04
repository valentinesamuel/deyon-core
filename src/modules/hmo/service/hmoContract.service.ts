import { HmoContractRepository } from '@adapters/repositories/hmoContract.repository';
import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { HmoContract } from '@modules/core/entities/hmoContract.entity';
import { FindResourceOptions } from '@adapters/repositories/base.repository';

@Injectable()
export class HmoContractService {
  private readonly logger = new Logger(HmoContractService.name);

  constructor(private readonly hmoContractRepository: HmoContractRepository) {}

  async createHmoContract(data: Partial<HmoContract>, em?: EntityManager) {
    return this.hmoContractRepository.createHmoContract(data, em);
  }

  async getHmoContractByDataOrFailIfNotExists(
    data: FindResourceOptions<HmoContract>,
    em?: EntityManager,
  ) {
    return this.hmoContractRepository.findOneOrFailIfNotExists(data, em);
  }

  async getHmoContractByDataOrFailIfExists(
    data: FindResourceOptions<HmoContract>,
    em?: EntityManager,
  ) {
    return this.hmoContractRepository.findOneOrFailIfExists(data, em);
  }

  async updateHmoContract(id: string, data: Partial<HmoContract>, em?: EntityManager) {
    return this.hmoContractRepository.updateHmoContract(id, data, em);
  }

  async softDeleteHmoContract(id: string, em?: EntityManager) {
    return this.hmoContractRepository.softDeleteHmoContract(id, em);
  }
}
