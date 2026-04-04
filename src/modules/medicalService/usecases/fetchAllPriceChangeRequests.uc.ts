import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CursorPage, QueryEngineService, QueryInput } from '@shared/queryEngine';
import { PriceChange } from '@modules/core/entities/priceChange.entity';
import { PRICE_CHANGE_QUERY_CONFIG } from '../medicalService.constants';

type FetchAllPriceChangeRequestsParams = { query: QueryInput };

@Injectable()
export class FetchAllPriceChangeRequestsUsecase extends Usecase<
  CursorPage<PriceChange>,
  FetchAllPriceChangeRequestsParams
> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly queryEngine: QueryEngineService) {
    super();
  }

  async execute(
    em: EntityManager,
    params: FetchAllPriceChangeRequestsParams,
  ): Promise<CursorPage<PriceChange>> {
    return this.queryEngine.execute(PriceChange, params.query, PRICE_CHANGE_QUERY_CONFIG);
  }
}
