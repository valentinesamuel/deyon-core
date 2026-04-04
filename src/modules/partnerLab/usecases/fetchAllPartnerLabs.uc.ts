import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CursorPage, QueryEngineService, QueryInput } from '@shared/queryEngine';
import { PartnerLab } from '@modules/core/entities/partnerLab.entity';
import { PARTNER_LAB_QUERY_CONFIG } from '../partnerLab.constants';

type FetchAllPartnerLabsParams = { query: QueryInput };

@Injectable()
export class FetchAllPartnerLabsUsecase extends Usecase<
  CursorPage<PartnerLab>,
  FetchAllPartnerLabsParams
> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly queryEngine: QueryEngineService) {
    super();
  }

  async execute(
    em: EntityManager,
    params: FetchAllPartnerLabsParams,
  ): Promise<CursorPage<PartnerLab>> {
    return this.queryEngine.execute(PartnerLab, params.query, PARTNER_LAB_QUERY_CONFIG);
  }
}
