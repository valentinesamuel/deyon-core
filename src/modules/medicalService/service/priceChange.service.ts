import { PriceChangeRepository } from '@adapters/repositories/priceChange.repository';
import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { PriceChange } from '@modules/core/entities/priceChange.entity';
import { FindResourceOptions } from '@adapters/repositories/base.repository';

@Injectable()
export class PriceChangeService {
  private readonly logger = new Logger(PriceChangeService.name);

  constructor(private readonly priceChangeRepository: PriceChangeRepository) {}

  async createPriceChange(data: Partial<PriceChange>, em?: EntityManager) {
    return this.priceChangeRepository.createPriceChange(data, em);
  }

  async getPriceChangeByDataOrFailIfNotExists(
    data: FindResourceOptions<PriceChange>,
    em?: EntityManager,
  ) {
    return this.priceChangeRepository.findOneOrFailIfNotExists(data, em);
  }

  async updatePriceChange(id: string, data: Partial<PriceChange>, em?: EntityManager) {
    return this.priceChangeRepository.updatePriceChange(id, data, em);
  }
}
