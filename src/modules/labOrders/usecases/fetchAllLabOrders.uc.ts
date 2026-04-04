import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CursorPage, QueryEngineService, QueryInput } from '@shared/queryEngine';
import { LabOrder } from '@modules/core/entities/labOrder.entity';
import { LAB_ORDER_QUERY_CONFIG } from '../labOrders.constants';

type TParams = { query: QueryInput };

@Injectable()
export class FetchAllLabOrdersUsecase extends Usecase<CursorPage<LabOrder>, TParams> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly queryEngine: QueryEngineService) {
    super();
  }

  async execute(_em: EntityManager, params: TParams): Promise<CursorPage<LabOrder>> {
    return this.queryEngine.execute(LabOrder, params.query, LAB_ORDER_QUERY_CONFIG);
  }
}
