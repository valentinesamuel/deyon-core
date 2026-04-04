import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { Inventory } from '@modules/core/entities/inventory.entity';

@Injectable()
export class FetchExpiringInventoryUsecase extends Usecase<Inventory[], Record<string, never>> {
  readonly config = { requiresTransaction: false };

  async execute(em: EntityManager): Promise<Inventory[]> {
    const cutoff = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    return em
      .getRepository(Inventory)
      .createQueryBuilder('inv')
      .where('inv.expiry_date IS NOT NULL')
      .andWhere('inv.expiry_date <= :cutoff', { cutoff })
      .andWhere('inv.deleted_at IS NULL')
      .getMany();
  }
}
