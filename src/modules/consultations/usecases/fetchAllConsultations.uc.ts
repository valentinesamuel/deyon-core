import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CursorPage, QueryEngineService, QueryInput } from '@shared/queryEngine';
import { Consultation } from '@modules/core/entities/consultation.entity';
import { CONSULTATION_QUERY_CONFIG } from '../consultation.constants';

type TParams = { query: QueryInput };

@Injectable()
export class FetchAllConsultationsUsecase extends Usecase<CursorPage<Consultation>, TParams> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly queryEngine: QueryEngineService) {
    super();
  }

  async execute(_em: EntityManager, params: TParams): Promise<CursorPage<Consultation>> {
    return this.queryEngine.execute(Consultation, params.query, CONSULTATION_QUERY_CONFIG);
  }
}
