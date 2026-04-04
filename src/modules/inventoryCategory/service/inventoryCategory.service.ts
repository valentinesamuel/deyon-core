import { InventoryCategoryRepository } from '@adapters/repositories/inventoryCategory.repository';
import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { InventoryCategory } from '@modules/core/entities/inventoryCategory.entity';
import { FindResourceOptions } from '@adapters/repositories/base.repository';

@Injectable()
export class InventoryCategoryService {
  private readonly logger = new Logger(InventoryCategoryService.name);

  constructor(private readonly inventoryCategoryRepository: InventoryCategoryRepository) {}

  async createInventoryCategory(data: Partial<InventoryCategory>, em?: EntityManager) {
    return this.inventoryCategoryRepository.createInventoryCategory(data, em);
  }

  async getInventoryCategoryByDataOrFailIfNotExists(
    data: FindResourceOptions<InventoryCategory>,
    em?: EntityManager,
  ) {
    return this.inventoryCategoryRepository.findOneOrFailIfNotExists(data, em);
  }

  async getInventoryCategoryByDataOrFailIfExists(
    data: FindResourceOptions<InventoryCategory>,
    em?: EntityManager,
  ) {
    return this.inventoryCategoryRepository.findOneOrFailIfExists(data, em);
  }

  async updateInventoryCategory(id: string, data: Partial<InventoryCategory>, em?: EntityManager) {
    return this.inventoryCategoryRepository.updateInventoryCategory(id, data, em);
  }
}
