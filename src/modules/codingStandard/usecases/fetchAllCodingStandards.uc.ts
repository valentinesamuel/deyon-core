import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CursorPage, QueryEngineService, QueryInput } from '@shared/queryEngine';
import { CodingStandard } from '@modules/core/entities/codingStandard.entity';
import { CODING_STANDARD_QUERY_CONFIG } from '../codingStandard.constants';

type FetchAllCodingStandardsParams = { query: QueryInput };

@Injectable()
export class FetchAllCodingStandardsUsecase extends Usecase<
  CursorPage<CodingStandard>,
  FetchAllCodingStandardsParams
> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly queryEngine: QueryEngineService) {
    super();
  }

  async execute(
    em: EntityManager,
    params: FetchAllCodingStandardsParams,
  ): Promise<CursorPage<CodingStandard>> {
    return this.queryEngine.execute(CodingStandard, params.query, CODING_STANDARD_QUERY_CONFIG);
  }
}
