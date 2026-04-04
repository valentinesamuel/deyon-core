import { Injectable, BadRequestException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { RefundPaymentDto } from '../dto/refundPayment.dto';
import { BillingService } from '../service/billing.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { Bill, BillStatusEnum } from '@modules/core/entities/bill.entity';
import { PaymentTransactionTypeEnum } from '@modules/core/entities/payment.entity';

type TParams = { id: string } & RefundPaymentDto;
type TResult = { bill: Bill };

@Injectable()
export class RefundPaymentUsecase extends Usecase<TResult, TParams> {
  constructor(
    private readonly billingService: BillingService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: TParams): Promise<TResult> {
    const existing = await this.billingService.getBillOrFail({ where: { id: params.id } }, em);

    if (Number(existing.amountPaid) < params.amount) {
      throw new BadRequestException(
        `Refund amount (${params.amount}) exceeds amount paid (${existing.amountPaid}).`,
      );
    }

    const staffId = this.requestContextService.getUserId();
    await this.billingService.createPayment(
      {
        billId: params.id,
        patientId: params.patientId,
        type: PaymentTransactionTypeEnum.REFUND,
        amount: params.amount,
        paymentMethod: params.paymentMethod,
        staffId,
      },
      em,
    );

    const newAmountPaid = Number(existing.amountPaid) - params.amount;
    const newBalance = Number(existing.total) - newAmountPaid;

    const bill = await this.billingService.updateBill(
      { id: params.id },
      {
        amountPaid: newAmountPaid,
        balance: newBalance,
        status: BillStatusEnum.REFUNDED,
      },
      em,
    );

    await this.eventService.log(
      {
        actorId: staffId,
        event: EventType.BILL_REFUNDED,
        module: EventModule.BILLING,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { billId: params.id, amount: params.amount, reason: params.reason },
      },
      em,
    );

    return { bill };
  }
}
