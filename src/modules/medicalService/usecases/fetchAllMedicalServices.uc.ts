import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CursorPage, QueryEngineService, QueryInput } from '@shared/queryEngine';
import { MedicalService } from '@modules/core/entities/medicalService.entity';
import { MEDICAL_SERVICE_QUERY_CONFIG } from '../medicalService.constants';

type FetchAllMedicalServicesParams = { query: QueryInput };

@Injectable()
export class FetchAllMedicalServicesUsecase extends Usecase<
  CursorPage<MedicalService>,
  FetchAllMedicalServicesParams
> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly queryEngine: QueryEngineService) {
    super();
  }

  async execute(
    em: EntityManager,
    params: FetchAllMedicalServicesParams,
  ): Promise<CursorPage<MedicalService>> {
    return this.queryEngine.execute(MedicalService, params.query, MEDICAL_SERVICE_QUERY_CONFIG);
  }
}
