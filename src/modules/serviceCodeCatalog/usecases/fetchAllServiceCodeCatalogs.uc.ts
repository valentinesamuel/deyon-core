import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { ServiceCodeCatalog } from '@modules/core/entities/serviceCodeCatalog.entity';
import { CursorPage, QueryEngineService, QueryInput } from '@shared/queryEngine';
import { SERVICE_CODE_CATALOG_QUERY_CONFIG } from '../serviceCodeCatalog.constants';

type TFetchAllServiceCodeCatalogsParams = { query: QueryInput };

@Injectable()
export class FetchAllServiceCodeCatalogsUsecase extends Usecase<
  CursorPage<ServiceCodeCatalog>,
  TFetchAllServiceCodeCatalogsParams
> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly queryEngine: QueryEngineService) {
    super();
  }

  async execute(
    _em: EntityManager,
    params: TFetchAllServiceCodeCatalogsParams,
  ): Promise<CursorPage<ServiceCodeCatalog>> {
    return this.queryEngine.execute(
      ServiceCodeCatalog,
      params.query,
      SERVICE_CODE_CATALOG_QUERY_CONFIG,
    );
  }
}
