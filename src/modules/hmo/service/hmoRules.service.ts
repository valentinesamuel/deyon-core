import { HmoRulesRepository } from '@adapters/repositories/hmoRules.repository';
import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { HmoRules } from '@modules/core/entities/hmoRules.entity';
import { FindResourceOptions } from '@adapters/repositories/base.repository';

@Injectable()
export class HmoRulesService {
  private readonly logger = new Logger(HmoRulesService.name);

  constructor(private readonly hmoRulesRepository: HmoRulesRepository) {}

  async createHmoRule(data: Partial<HmoRules>, em?: EntityManager) {
    return this.hmoRulesRepository.createHmoRule(data, em);
  }

  async getHmoRuleByDataOrFailIfNotExists(data: FindResourceOptions<HmoRules>, em?: EntityManager) {
    return this.hmoRulesRepository.findOneOrFailIfNotExists(data, em);
  }

  async getHmoRuleByDataOrFailIfExists(data: FindResourceOptions<HmoRules>, em?: EntityManager) {
    return this.hmoRulesRepository.findOneOrFailIfExists(data, em);
  }

  async updateHmoRule(id: string, data: Partial<HmoRules>, em?: EntityManager) {
    return this.hmoRulesRepository.updateHmoRule(id, data, em);
  }

  async softDeleteHmoRule(id: string, em?: EntityManager) {
    return this.hmoRulesRepository.softDeleteHmoRule(id, em);
  }
}
