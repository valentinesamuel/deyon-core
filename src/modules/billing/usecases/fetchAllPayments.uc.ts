import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CursorPage, QueryEngineService, QueryInput } from '@shared/queryEngine';
import { Payment } from '@modules/core/entities/payment.entity';
import { PAYMENT_QUERY_CONFIG } from '../payment.constants';

type TParams = { query: QueryInput };

@Injectable()
export class FetchAllPaymentsUsecase extends Usecase<CursorPage<Payment>, TParams> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly queryEngine: QueryEngineService) {
    super();
  }

  async execute(_em: EntityManager, params: TParams): Promise<CursorPage<Payment>> {
    return this.queryEngine.execute(Payment, params.query, PAYMENT_QUERY_CONFIG);
  }
}
