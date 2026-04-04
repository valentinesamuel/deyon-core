import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CursorPage, QueryEngineService, QueryInput } from '@shared/queryEngine';
import { MedicalServiceCategory } from '@modules/core/entities/medicalServiceCategory.entity';
import { MEDICAL_SERVICE_CATEGORY_QUERY_CONFIG } from '../medicalServiceCategory.constants';

type FetchAllMedicalServiceCategoriesParams = { query: QueryInput };

@Injectable()
export class FetchAllMedicalServiceCategoriesUsecase extends Usecase<
  CursorPage<MedicalServiceCategory>,
  FetchAllMedicalServiceCategoriesParams
> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly queryEngine: QueryEngineService) {
    super();
  }

  async execute(
    em: EntityManager,
    params: FetchAllMedicalServiceCategoriesParams,
  ): Promise<CursorPage<MedicalServiceCategory>> {
    return this.queryEngine.execute(
      MedicalServiceCategory,
      params.query,
      MEDICAL_SERVICE_CATEGORY_QUERY_CONFIG,
    );
  }
}
