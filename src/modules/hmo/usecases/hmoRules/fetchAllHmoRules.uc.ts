import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CursorPage, QueryEngineService, QueryInput } from '@shared/queryEngine';
import { HmoRules } from '@modules/core/entities/hmoRules.entity';
import { HMO_RULES_QUERY_CONFIG } from '../../hmo.constants';

type FetchAllHmoRulesParams = { query: QueryInput; providerId: string };

@Injectable()
export class FetchAllHmoRulesUsecase extends Usecase<CursorPage<HmoRules>, FetchAllHmoRulesParams> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly queryEngine: QueryEngineService) {
    super();
  }

  async execute(em: EntityManager, params: FetchAllHmoRulesParams): Promise<CursorPage<HmoRules>> {
    const { query, providerId } = params;

    const mergedQuery: QueryInput = {
      ...query,
      filter: {
        ...(query.filter ?? {}),
        hmoProviderId: { eq: providerId },
      },
    };

    return this.queryEngine.execute(HmoRules, mergedQuery, HMO_RULES_QUERY_CONFIG);
  }
}
