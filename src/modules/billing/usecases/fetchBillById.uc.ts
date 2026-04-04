import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { BillingService } from '../service/billing.service';
import { Bill } from '@modules/core/entities/bill.entity';

type TParams = { id: string };
type TResult = { bill: Bill };

@Injectable()
export class FetchBillByIdUsecase extends Usecase<TResult, TParams> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly billingService: BillingService) {
    super();
  }

  async execute(_em: EntityManager, params: TParams): Promise<TResult> {
    const bill = await this.billingService.getBillOrFail({
      where: { id: params.id },
      relations: { patient: true, department: true, items: { service: true }, payments: true },
    });
    return { bill };
  }
}
