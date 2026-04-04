import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CursorPage, QueryEngineService, QueryInput } from '@shared/queryEngine';
import { HmoContract } from '@modules/core/entities/hmoContract.entity';
import { HMO_CONTRACT_QUERY_CONFIG } from '../../hmo.constants';

type FetchAllHmoContractsParams = { query: QueryInput; providerId: string };

@Injectable()
export class FetchAllHmoContractsUsecase extends Usecase<
  CursorPage<HmoContract>,
  FetchAllHmoContractsParams
> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly queryEngine: QueryEngineService) {
    super();
  }

  async execute(
    em: EntityManager,
    params: FetchAllHmoContractsParams,
  ): Promise<CursorPage<HmoContract>> {
    const { query, providerId } = params;

    const mergedQuery: QueryInput = {
      ...query,
      filter: {
        ...(query.filter ?? {}),
        hmoProviderId: { eq: providerId },
      },
    };

    return this.queryEngine.execute(HmoContract, mergedQuery, HMO_CONTRACT_QUERY_CONFIG);
  }
}
