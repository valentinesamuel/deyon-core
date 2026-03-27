import { HmoProviderRepository } from '@adapters/repositories/hmoProvider.repository';
import { Logger } from '@nestjs/common';
import { CreateHmoProviderDto } from '../dto.createHmoProvider.dto';
import { EntityManager } from 'typeorm';

export class HmoProviderService {
  private readonly logger = new Logger(HmoProviderService.name);

  constructor(private readonly hmoProviderRepository: HmoProviderRepository) {}

  async createHmoProvider(data: CreateHmoProviderDto, em?: EntityManager) {
    return this.hmoProviderRepository.createHmoProvider(data, em);
  }
}
