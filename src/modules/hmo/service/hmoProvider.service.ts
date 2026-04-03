import { HmoProviderRepository } from '@adapters/repositories/hmoProvider.repository';
import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { HmoProvider } from '@modules/core/entities/hmoProvider.entity';
import { FindResourceOptions } from '@adapters/repositories/base.repository';

@Injectable()
export class HmoProviderService {
  private readonly logger = new Logger(HmoProviderService.name);

  constructor(private readonly hmoProviderRepository: HmoProviderRepository) {}

  async createHmoProvider(data: Partial<HmoProvider>, em?: EntityManager) {
    return this.hmoProviderRepository.createHmoProvider(data, em);
  }

  async getHmoProviderByDataOrFailIfNotExists(
    data: FindResourceOptions<HmoProvider>,
    em?: EntityManager,
  ) {
    return this.hmoProviderRepository.findOneOrFailIfNotExists(data, em);
  }

  async getHmoProviderByDataOrFailIfExists(
    data: FindResourceOptions<HmoProvider>,
    em?: EntityManager,
  ) {
    return this.hmoProviderRepository.findOneOrFailIfExists(data, em);
  }

  async updateHmoProvider(id: string, data: Partial<HmoProvider>, em?: EntityManager) {
    return this.hmoProviderRepository.updateHmoProvider(id, data, em);
  }
}
