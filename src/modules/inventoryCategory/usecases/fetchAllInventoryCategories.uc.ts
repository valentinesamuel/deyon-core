import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CursorPage, QueryEngineService, QueryInput } from '@shared/queryEngine';
import { InventoryCategory } from '@modules/core/entities/inventoryCategory.entity';
import { INVENTORY_CATEGORY_QUERY_CONFIG } from '../inventoryCategory.constants';

type FetchAllInventoryCategoriesParams = { query: QueryInput };

@Injectable()
export class FetchAllInventoryCategoriesUsecase extends Usecase<
  CursorPage<InventoryCategory>,
  FetchAllInventoryCategoriesParams
> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly queryEngine: QueryEngineService) {
    super();
  }

  async execute(
    em: EntityManager,
    params: FetchAllInventoryCategoriesParams,
  ): Promise<CursorPage<InventoryCategory>> {
    return this.queryEngine.execute(
      InventoryCategory,
      params.query,
      INVENTORY_CATEGORY_QUERY_CONFIG,
    );
  }
}
