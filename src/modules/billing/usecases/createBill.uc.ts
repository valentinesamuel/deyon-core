import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CreateBillDto } from '../dto/createBill.dto';
import { BillingService } from '../service/billing.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { Bill, BillStatusEnum } from '@modules/core/entities/bill.entity';

type TResult = { bill: Bill };

@Injectable()
export class CreateBillUsecase extends Usecase<TResult, CreateBillDto> {
  constructor(
    private readonly billingService: BillingService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: CreateBillDto): Promise<TResult> {
    const staffId = this.requestContextService.getUserId();

    const bill = await this.billingService.createBill(
      {
        type: params.type,
        patientId: params.patientId ?? null,
        departmentId: params.departmentId,
        episodeId: params.episodeId,
        shiftId: params.shiftId,
        status: BillStatusEnum.PENDING,
        isWalkIn: params.isWalkIn ?? false,
        walkInCustomerName: params.walkInCustomerName ?? null,
        walkInPhone: params.walkInPhone ?? null,
        notes: params.notes,
        createdBy: staffId,
        subtotal: 0,
        discount: 0,
        tax: 0,
        total: 0,
        amountPaid: 0,
        balance: 0,
      },
      em,
    );

    await this.eventService.log(
      {
        actorId: staffId,
        event: EventType.BILL_CREATED,
        module: EventModule.BILLING,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { billId: bill.id, billNumber: bill.billNumber },
      },
      em,
    );

    return { bill };
  }
}
