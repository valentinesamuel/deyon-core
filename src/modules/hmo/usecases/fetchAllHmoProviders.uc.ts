import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CursorPage, QueryEngineService, QueryInput } from '@shared/queryEngine';
import { HmoProvider } from '@modules/core/entities/hmoProvider.entity';
import { HMO_PROVIDER_QUERY_CONFIG } from '../hmo.constants';

type FetchAllHmoProvidersParams = { query: QueryInput };

@Injectable()
export class FetchAllHmoProvidersUsecase extends Usecase<
  CursorPage<HmoProvider>,
  FetchAllHmoProvidersParams
> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly queryEngine: QueryEngineService) {
    super();
  }

  async execute(
    em: EntityManager,
    params: FetchAllHmoProvidersParams,
  ): Promise<CursorPage<HmoProvider>> {
    return this.queryEngine.execute(HmoProvider, params.query, HMO_PROVIDER_QUERY_CONFIG);
  }
}
