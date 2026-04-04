import { ProtocolBundleItemRepository } from '@adapters/repositories/protocolBundleItem.repository';
import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ProtocolBundleItems } from '@modules/core/entities/protocolBundleItems.entity';

@Injectable()
export class ProtocolBundleItemService {
  private readonly logger = new Logger(ProtocolBundleItemService.name);

  constructor(private readonly protocolBundleItemRepository: ProtocolBundleItemRepository) {}

  async createProtocolBundleItem(data: Partial<ProtocolBundleItems>, em?: EntityManager) {
    return this.protocolBundleItemRepository.createProtocolBundleItem(data, em);
  }

  async softDeleteProtocolBundleItem(id: string, em?: EntityManager) {
    return this.protocolBundleItemRepository.softDeleteProtocolBundleItem(id, em);
  }
}
