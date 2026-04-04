import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CursorPage, QueryEngineService, QueryInput } from '@shared/queryEngine';
import { RestockRequest } from '@modules/core/entities/restockRequest.entity';
import { STOCK_REQUEST_QUERY_CONFIG } from '../stockRequests.constants';

type TParams = { query: QueryInput };

@Injectable()
export class FetchAllStockRequestsUsecase extends Usecase<CursorPage<RestockRequest>, TParams> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly queryEngine: QueryEngineService) {
    super();
  }

  async execute(_em: EntityManager, params: TParams): Promise<CursorPage<RestockRequest>> {
    return this.queryEngine.execute(RestockRequest, params.query, STOCK_REQUEST_QUERY_CONFIG);
  }
}
