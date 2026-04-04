import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CursorPage, QueryEngineService, QueryInput } from '@shared/queryEngine';
import { Episode } from '@modules/core/entities/episode.entity';
import { EPISODE_QUERY_CONFIG } from '../episodes.constants';

type TFetchAllEpisodesParams = { query: QueryInput };

@Injectable()
export class FetchAllEpisodesUsecase extends Usecase<CursorPage<Episode>, TFetchAllEpisodesParams> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly queryEngine: QueryEngineService) {
    super();
  }

  async execute(_em: EntityManager, params: TFetchAllEpisodesParams): Promise<CursorPage<Episode>> {
    return this.queryEngine.execute(Episode, params.query, EPISODE_QUERY_CONFIG);
  }
}
