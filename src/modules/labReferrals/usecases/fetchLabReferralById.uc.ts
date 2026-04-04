import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { LabReferralsService } from '../service/labReferrals.service';
import { LabReferral } from '@modules/core/entities/labReferral.entity';

type TParams = { id: string };
type TResult = { referral: LabReferral };

@Injectable()
export class FetchLabReferralByIdUsecase extends Usecase<TResult, TParams> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly labReferralsService: LabReferralsService) {
    super();
  }

  async execute(_em: EntityManager, params: TParams): Promise<TResult> {
    const referral = await this.labReferralsService.getReferralOrFail({
      where: { id: params.id },
      relations: { patient: true, partnerLab: true, referredByStaff: true, items: true },
    });
    return { referral };
  }
}
