import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CursorPage, QueryEngineService, QueryInput } from '@shared/queryEngine';
import { MedicalCode } from '@modules/core/entities/medicalCode.entity';
import { MEDICAL_CODE_QUERY_CONFIG } from '../codingStandard.constants';

type FetchMedicalCodesByStandardParams = { standardId: string; query: QueryInput };

@Injectable()
export class FetchMedicalCodesByStandardUsecase extends Usecase<
  CursorPage<MedicalCode>,
  FetchMedicalCodesByStandardParams
> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly queryEngine: QueryEngineService) {
    super();
  }

  async execute(
    em: EntityManager,
    params: FetchMedicalCodesByStandardParams,
  ): Promise<CursorPage<MedicalCode>> {
    const queryWithStandardFilter: QueryInput = {
      ...params.query,
      filter: {
        ...params.query?.filter,
        standardId: { eq: params.standardId },
      },
    };

    return this.queryEngine.execute(
      MedicalCode,
      queryWithStandardFilter,
      MEDICAL_CODE_QUERY_CONFIG,
    );
  }
}
