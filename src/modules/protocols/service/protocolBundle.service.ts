import { ProtocolBundleRepository } from '@adapters/repositories/protocolBundle.repository';
import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ProtocolBundle } from '@modules/core/entities/protocolBundles.entity';
import { FindResourceOptions } from '@adapters/repositories/base.repository';

@Injectable()
export class ProtocolBundleService {
  private readonly logger = new Logger(ProtocolBundleService.name);

  constructor(private readonly protocolBundleRepository: ProtocolBundleRepository) {}

  async createProtocolBundle(data: Partial<ProtocolBundle>, em?: EntityManager) {
    return this.protocolBundleRepository.createProtocolBundle(data, em);
  }

  async getProtocolBundleByDataOrFailIfNotExists(
    data: FindResourceOptions<ProtocolBundle>,
    em?: EntityManager,
  ) {
    return this.protocolBundleRepository.findOneOrFailIfNotExists(data, em);
  }

  async getProtocolBundleByDataOrFailIfExists(
    data: FindResourceOptions<ProtocolBundle>,
    em?: EntityManager,
  ) {
    return this.protocolBundleRepository.findOneOrFailIfExists(data, em);
  }

  async updateProtocolBundle(id: string, data: Partial<ProtocolBundle>, em?: EntityManager) {
    return this.protocolBundleRepository.updateProtocolBundle(id, data, em);
  }

  async softDeleteProtocolBundle(id: string, em?: EntityManager) {
    return this.protocolBundleRepository.softDeleteProtocolBundle(id, em);
  }
}
