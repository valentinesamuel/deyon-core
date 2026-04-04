import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CursorPage, QueryEngineService, QueryInput } from '@shared/queryEngine';
import { Patient } from '@modules/core/entities/patient.entity';
import { PATIENT_QUERY_CONFIG } from '../patient.constants';

type TFetchAllPatientsParams = { query: QueryInput };

@Injectable()
export class FetchAllPatientsUsecase extends Usecase<CursorPage<Patient>, TFetchAllPatientsParams> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly queryEngine: QueryEngineService) {
    super();
  }

  async execute(_em: EntityManager, params: TFetchAllPatientsParams): Promise<CursorPage<Patient>> {
    return this.queryEngine.execute(Patient, params.query, PATIENT_QUERY_CONFIG);
  }
}
