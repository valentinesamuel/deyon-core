import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CursorPage, QueryEngineService, QueryInput } from '@shared/queryEngine';
import { LabReferral } from '@modules/core/entities/labReferral.entity';
import { LAB_REFERRAL_QUERY_CONFIG } from '../labReferrals.constants';

type TParams = { query: QueryInput };

@Injectable()
export class FetchAllLabReferralsUsecase extends Usecase<CursorPage<LabReferral>, TParams> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly queryEngine: QueryEngineService) {
    super();
  }

  async execute(_em: EntityManager, params: TParams): Promise<CursorPage<LabReferral>> {
    return this.queryEngine.execute(LabReferral, params.query, LAB_REFERRAL_QUERY_CONFIG);
  }
}
