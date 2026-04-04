import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CursorPage, QueryEngineService, QueryInput } from '@shared/queryEngine';
import { Bill } from '@modules/core/entities/bill.entity';
import { BILL_QUERY_CONFIG } from '../billing.constants';

type TParams = { query: QueryInput };

@Injectable()
export class FetchAllBillsUsecase extends Usecase<CursorPage<Bill>, TParams> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly queryEngine: QueryEngineService) {
    super();
  }

  async execute(_em: EntityManager, params: TParams): Promise<CursorPage<Bill>> {
    return this.queryEngine.execute(Bill, params.query, BILL_QUERY_CONFIG);
  }
}
