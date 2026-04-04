import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CursorPage, QueryEngineService, QueryInput } from '@shared/queryEngine';
import { Supplier } from '@modules/core/entities/supplier.entity';
import { SUPPLIER_QUERY_CONFIG } from '../supplier.constants';

type FetchAllSuppliersParams = { query: QueryInput };

@Injectable()
export class FetchAllSuppliersUsecase extends Usecase<
  CursorPage<Supplier>,
  FetchAllSuppliersParams
> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly queryEngine: QueryEngineService) {
    super();
  }

  async execute(em: EntityManager, params: FetchAllSuppliersParams): Promise<CursorPage<Supplier>> {
    return this.queryEngine.execute(Supplier, params.query, SUPPLIER_QUERY_CONFIG);
  }
}
