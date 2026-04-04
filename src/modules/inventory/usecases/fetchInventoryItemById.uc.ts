import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { InventoryService } from '../service/inventory.service';
import { Inventory } from '@modules/core/entities/inventory.entity';

type TFetchInventoryItemByIdParams = { id: string };

@Injectable()
export class FetchInventoryItemByIdUsecase extends Usecase<
  Inventory,
  TFetchInventoryItemByIdParams
> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly inventoryService: InventoryService) {
    super();
  }

  async execute(em: EntityManager, params: TFetchInventoryItemByIdParams): Promise<Inventory> {
    return this.inventoryService.getInventoryByDataOrFailIfNotExists(
      { where: { id: params.id } },
      em,
    );
  }
}
