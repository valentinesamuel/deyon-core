import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CursorPage, QueryEngineService, QueryInput } from '@shared/queryEngine';
import { Inventory } from '@modules/core/entities/inventory.entity';
import { INVENTORY_QUERY_CONFIG } from '../inventory.constants';

type FetchAllInventoryParams = { query: QueryInput };

@Injectable()
export class FetchAllInventoryUsecase extends Usecase<
  CursorPage<Inventory>,
  FetchAllInventoryParams
> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly queryEngine: QueryEngineService) {
    super();
  }

  async execute(
    em: EntityManager,
    params: FetchAllInventoryParams,
  ): Promise<CursorPage<Inventory>> {
    return this.queryEngine.execute(Inventory, params.query, INVENTORY_QUERY_CONFIG);
  }
}
