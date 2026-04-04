import { Injectable, BadRequestException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { RecordPaymentDto } from '../dto/recordPayment.dto';
import { BillingService } from '../service/billing.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { Bill, BillStatusEnum } from '@modules/core/entities/bill.entity';
import { PaymentTransactionTypeEnum } from '@modules/core/entities/payment.entity';

type TParams = { id: string } & RecordPaymentDto;
type TResult = { bill: Bill };

@Injectable()
export class RecordPaymentUsecase extends Usecase<TResult, TParams> {
  constructor(
    private readonly billingService: BillingService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: TParams): Promise<TResult> {
    const existing = await this.billingService.getBillOrFail({ where: { id: params.id } }, em);

    if (existing.status === BillStatusEnum.PAID) {
      throw new BadRequestException('This bill is already fully paid.');
    }

    if (existing.status === BillStatusEnum.REFUNDED) {
      throw new BadRequestException('Cannot record payment for a refunded bill.');
    }

    const currentBalance = Number(existing.balance);
    if (params.amount > currentBalance) {
      throw new BadRequestException(
        `Payment amount (${params.amount}) exceeds outstanding balance (${currentBalance}).`,
      );
    }

    const staffId = this.requestContextService.getUserId();
    await this.billingService.createPayment(
      {
        billId: params.id,
        patientId: params.patientId,
        shiftId: params.shiftId,
        type: PaymentTransactionTypeEnum.PAYMENT,
        amount: params.amount,
        paymentMethod: params.paymentMethod,
        staffId,
      },
      em,
    );

    const newAmountPaid = Number(existing.amountPaid) + params.amount;
    const newBalance = Number(existing.total) - newAmountPaid;
    const newStatus = newBalance <= 0 ? BillStatusEnum.PAID : BillStatusEnum.PARTIAL;

    const bill = await this.billingService.updateBill(
      { id: params.id },
      {
        amountPaid: newAmountPaid,
        balance: Math.max(0, newBalance),
        status: newStatus,
        paymentMethod: params.paymentMethod,
        ...(newStatus === BillStatusEnum.PAID && { paidAt: new Date() }),
      },
      em,
    );

    const eventType =
      newStatus === BillStatusEnum.PAID ? EventType.BILL_PAID : EventType.BILL_PARTIALLY_PAID;
    await this.eventService.log(
      {
        actorId: staffId,
        event: eventType,
        module: EventModule.BILLING,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { billId: params.id, amount: params.amount, newBalance },
      },
      em,
    );

    return { bill };
  }
}
