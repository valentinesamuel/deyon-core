import { PartnerLabRepository } from '@adapters/repositories/partnerLab.repository';
import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { PartnerLab } from '@modules/core/entities/partnerLab.entity';
import { FindResourceOptions } from '@adapters/repositories/base.repository';

@Injectable()
export class PartnerLabService {
  private readonly logger = new Logger(PartnerLabService.name);

  constructor(private readonly partnerLabRepository: PartnerLabRepository) {}

  async createPartnerLab(data: Partial<PartnerLab>, em?: EntityManager) {
    return this.partnerLabRepository.createPartnerLab(data, em);
  }

  async getPartnerLabByDataOrFailIfNotExists(
    data: FindResourceOptions<PartnerLab>,
    em?: EntityManager,
  ) {
    return this.partnerLabRepository.findOneOrFailIfNotExists(data, em);
  }

  async getPartnerLabByDataOrFailIfExists(
    data: FindResourceOptions<PartnerLab>,
    em?: EntityManager,
  ) {
    return this.partnerLabRepository.findOneOrFailIfExists(data, em);
  }

  async updatePartnerLab(id: string, data: Partial<PartnerLab>, em?: EntityManager) {
    return this.partnerLabRepository.updatePartnerLab(id, data, em);
  }
}
