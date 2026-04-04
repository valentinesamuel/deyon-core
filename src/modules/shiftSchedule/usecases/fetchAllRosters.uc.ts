import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CursorPage, QueryEngineService, QueryInput } from '@shared/queryEngine';
import { Roster } from '@modules/core/entities/roster.entity';
import { ROSTER_QUERY_CONFIG } from '../roster.constants';

type TFetchAllRostersParams = { query: QueryInput };

@Injectable()
export class FetchAllRostersUsecase extends Usecase<CursorPage<Roster>, TFetchAllRostersParams> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly queryEngine: QueryEngineService) {
    super();
  }

  async execute(_em: EntityManager, params: TFetchAllRostersParams): Promise<CursorPage<Roster>> {
    return this.queryEngine.execute(Roster, params.query, ROSTER_QUERY_CONFIG);
  }
}
