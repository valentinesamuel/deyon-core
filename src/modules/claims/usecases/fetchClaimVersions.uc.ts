import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { ClaimsService } from '../service/claims.service';
import { TClaimVersion } from '@modules/core/entities/claim.entity';

type TParams = { id: string };
type TResult = { versions: TClaimVersion[]; currentVersion: number };

@Injectable()
export class FetchClaimVersionsUsecase extends Usecase<TResult, TParams> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly claimsService: ClaimsService) {
    super();
  }

  async execute(_em: EntityManager, params: TParams): Promise<TResult> {
    const claim = await this.claimsService.getClaimOrFail({ where: { id: params.id } });
    return { versions: claim.versions ?? [], currentVersion: claim.currentVersion };
  }
}
