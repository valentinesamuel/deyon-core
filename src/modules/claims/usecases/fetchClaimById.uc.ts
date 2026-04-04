import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { ClaimsService } from '../service/claims.service';
import { Claim } from '@modules/core/entities/claim.entity';

type TParams = { id: string };
type TResult = { claim: Claim };

@Injectable()
export class FetchClaimByIdUsecase extends Usecase<TResult, TParams> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly claimsService: ClaimsService) {
    super();
  }

  async execute(_em: EntityManager, params: TParams): Promise<TResult> {
    const claim = await this.claimsService.getClaimOrFail({
      where: { id: params.id },
      relations: { episode: true, hmoProvider: true, claimItems: true, bills: true },
    });
    return { claim };
  }
}
