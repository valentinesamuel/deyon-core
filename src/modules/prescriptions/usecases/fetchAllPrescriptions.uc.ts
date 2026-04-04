import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CursorPage, QueryEngineService, QueryInput } from '@shared/queryEngine';
import { Prescription } from '@modules/core/entities/prescription.entity';
import { PRESCRIPTION_QUERY_CONFIG } from '../prescriptions.constants';

type TParams = { query: QueryInput };

@Injectable()
export class FetchAllPrescriptionsUsecase extends Usecase<CursorPage<Prescription>, TParams> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly queryEngine: QueryEngineService) {
    super();
  }

  async execute(_em: EntityManager, params: TParams): Promise<CursorPage<Prescription>> {
    return this.queryEngine.execute(Prescription, params.query, PRESCRIPTION_QUERY_CONFIG);
  }
}
