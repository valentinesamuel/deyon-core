import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { BillingService } from '../service/billing.service';
import { BillingCode, BillingCodeStatusEnum } from '@modules/core/entities/billingCode.entity';

type TParams = { code: string };
type TResult = { billingCode: BillingCode; isValid: boolean; reason?: string };

@Injectable()
export class ValidateBillingCodeUsecase extends Usecase<TResult, TParams> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly billingService: BillingService) {
    super();
  }

  async execute(_em: EntityManager, params: TParams): Promise<TResult> {
    const billingCode = await this.billingService.getBillingCodeOrFail({
      where: { code: params.code },
      relations: { patient: true },
    });

    if (billingCode.status !== BillingCodeStatusEnum.GENERATED) {
      return {
        billingCode,
        isValid: false,
        reason: `Billing code has status '${billingCode.status}'.`,
      };
    }

    if (new Date() > billingCode.expiresAt) {
      return { billingCode, isValid: false, reason: 'Billing code has expired.' };
    }

    return { billingCode, isValid: true };
  }
}
