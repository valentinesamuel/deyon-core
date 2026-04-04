import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CursorPage, QueryEngineService, QueryInput } from '@shared/queryEngine';
import { Claim } from '@modules/core/entities/claim.entity';
import { CLAIM_QUERY_CONFIG } from '../claims.constants';

type TParams = { query: QueryInput };

@Injectable()
export class FetchAllClaimsUsecase extends Usecase<CursorPage<Claim>, TParams> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly queryEngine: QueryEngineService) {
    super();
  }

  async execute(_em: EntityManager, params: TParams): Promise<CursorPage<Claim>> {
    return this.queryEngine.execute(Claim, params.query, CLAIM_QUERY_CONFIG);
  }
}
