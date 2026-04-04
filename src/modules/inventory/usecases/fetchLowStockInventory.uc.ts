import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { Inventory } from '@modules/core/entities/inventory.entity';

@Injectable()
export class FetchLowStockInventoryUsecase extends Usecase<Inventory[], Record<string, never>> {
  readonly config = { requiresTransaction: false };

  async execute(em: EntityManager): Promise<Inventory[]> {
    return em
      .getRepository(Inventory)
      .createQueryBuilder('inv')
      .where('inv.currentStock <= inv.reorderLevel')
      .andWhere('inv.deleted_at IS NULL')
      .getMany();
  }
}
