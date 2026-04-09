import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { ReferenceRange } from '@modules/core/entities/referenceRange.entity';
import { CursorPage, QueryEngineService, QueryInput } from '@shared/queryEngine';
import { REFERENCE_RANGE_QUERY_CONFIG } from '../labCatalog.constants';

type TFetchReferenceRangesByTestParams = { query: QueryInput };

@Injectable()
export class FetchReferenceRangesByTestUsecase extends Usecase<
  CursorPage<ReferenceRange>,
  TFetchReferenceRangesByTestParams
> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly queryEngine: QueryEngineService) {
    super();
  }

  async execute(
    _em: EntityManager,
    params: TFetchReferenceRangesByTestParams,
  ): Promise<CursorPage<ReferenceRange>> {
    return this.queryEngine.execute(ReferenceRange, params.query, REFERENCE_RANGE_QUERY_CONFIG);
  }
}
