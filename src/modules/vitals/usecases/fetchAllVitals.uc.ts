import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CursorPage, QueryEngineService, QueryInput } from '@shared/queryEngine';
import { PatientVital } from '@modules/core/entities/patientVitals.entity';
import { VITAL_QUERY_CONFIG } from '../vitals.constants';

type TParams = { query: QueryInput };

@Injectable()
export class FetchAllVitalsUsecase extends Usecase<CursorPage<PatientVital>, TParams> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly queryEngine: QueryEngineService) {
    super();
  }

  async execute(_em: EntityManager, params: TParams): Promise<CursorPage<PatientVital>> {
    return this.queryEngine.execute(PatientVital, params.query, VITAL_QUERY_CONFIG);
  }
}
