import { InventoryRepository } from '@adapters/repositories/inventory.repository';
import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Inventory } from '@modules/core/entities/inventory.entity';
import { FindResourceOptions } from '@adapters/repositories/base.repository';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private readonly inventoryRepository: InventoryRepository) {}

  async createInventoryItem(data: Partial<Inventory>, em?: EntityManager) {
    return this.inventoryRepository.createInventoryItem(data, em);
  }

  async getInventoryByDataOrFailIfNotExists(
    data: FindResourceOptions<Inventory>,
    em?: EntityManager,
  ) {
    return this.inventoryRepository.findOneOrFailIfNotExists(data, em);
  }

  async updateInventoryItem(id: string, data: Partial<Inventory>, em?: EntityManager) {
    return this.inventoryRepository.updateInventoryItem(id, data, em);
  }
}
