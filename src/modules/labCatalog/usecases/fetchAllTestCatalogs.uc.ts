import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CursorPage, QueryEngineService, QueryInput } from '@shared/queryEngine';
import { TestCatalog } from '@modules/core/entities/testCatalog.entity';
import { TEST_CATALOG_QUERY_CONFIG } from '../labCatalog.constants';

type FetchAllTestCatalogsParams = { query: QueryInput };

@Injectable()
export class FetchAllTestCatalogsUsecase extends Usecase<
  CursorPage<TestCatalog>,
  FetchAllTestCatalogsParams
> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly queryEngine: QueryEngineService) {
    super();
  }

  async execute(
    em: EntityManager,
    params: FetchAllTestCatalogsParams,
  ): Promise<CursorPage<TestCatalog>> {
    return this.queryEngine.execute(TestCatalog, params.query, TEST_CATALOG_QUERY_CONFIG);
  }
}
