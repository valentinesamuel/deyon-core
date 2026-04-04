import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { ReferenceRange } from '@modules/core/entities/referenceRange.entity';

type TFetchReferenceRangesByTestParams = { testId: string };

@Injectable()
export class FetchReferenceRangesByTestUsecase extends Usecase<
  ReferenceRange[],
  TFetchReferenceRangesByTestParams
> {
  readonly config = { requiresTransaction: false };

  async execute(
    em: EntityManager,
    params: TFetchReferenceRangesByTestParams,
  ): Promise<ReferenceRange[]> {
    return em.getRepository(ReferenceRange).find({ where: { testId: params.testId } });
  }
}
