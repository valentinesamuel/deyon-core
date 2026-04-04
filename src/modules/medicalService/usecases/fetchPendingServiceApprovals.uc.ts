import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import {
  MedicalService,
  MedicalServiceStatusEnum,
} from '@modules/core/entities/medicalService.entity';
import { CursorPage, QueryEngineService, QueryInput } from '@shared/queryEngine';
import { MEDICAL_SERVICE_QUERY_CONFIG } from '../medicalService.constants';

type FetchPendingServiceApprovalsParams = { query: QueryInput };

@Injectable()
export class FetchPendingServiceApprovalsUsecase extends Usecase<
  CursorPage<MedicalService>,
  FetchPendingServiceApprovalsParams
> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly queryEngine: QueryEngineService) {
    super();
  }

  async execute(
    em: EntityManager,
    params: FetchPendingServiceApprovalsParams,
  ): Promise<CursorPage<MedicalService>> {
    const mergedQuery: QueryInput = {
      ...params.query,
      filter: {
        ...(params.query?.filter ?? {}),
        status: { eq: MedicalServiceStatusEnum.PENDING },
      },
    };
    return this.queryEngine.execute(MedicalService, mergedQuery, MEDICAL_SERVICE_QUERY_CONFIG);
  }
}
