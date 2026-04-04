import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { GenerateBillingCodeDto } from '../dto/generateBillingCode.dto';
import { BillingService } from '../service/billing.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { BillingCode, BillingCodeStatusEnum } from '@modules/core/entities/billingCode.entity';
import { BILLING_CODE_EXPIRY_HOURS } from '../billing.constants';

type TResult = { billingCode: BillingCode };

@Injectable()
export class GenerateBillingCodeUsecase extends Usecase<TResult, GenerateBillingCodeDto> {
  constructor(
    private readonly billingService: BillingService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: GenerateBillingCodeDto): Promise<TResult> {
    const staffId = this.requestContextService.getUserId();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + BILLING_CODE_EXPIRY_HOURS);

    const billingCode = await this.billingService.createBillingCode(
      {
        patientId: params.patientId,
        department: params.department,
        amount: params.amount,
        status: BillingCodeStatusEnum.GENERATED,
        generatedBy: staffId,
        expiresAt,
        billId: null,
        paidAt: null,
        receiptNumber: null,
        hmoCoverage: null,
        patientLiability: null,
      },
      params.department,
      em,
    );

    await this.eventService.log(
      {
        actorId: staffId,
        event: EventType.BILLING_CODE_GENERATED,
        module: EventModule.BILLING,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { billingCodeId: billingCode.id, code: billingCode.code },
      },
      em,
    );

    return { billingCode };
  }
}
