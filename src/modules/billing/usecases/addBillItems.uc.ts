import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { AddBillItemsDto } from '../dto/addBillItems.dto';
import { BillingService } from '../service/billing.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { Bill } from '@modules/core/entities/bill.entity';

type TParams = { id: string } & AddBillItemsDto;
type TResult = { bill: Bill };

@Injectable()
export class AddBillItemsUsecase extends Usecase<TResult, TParams> {
  constructor(
    private readonly billingService: BillingService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: TParams): Promise<TResult> {
    const existing = await this.billingService.getBillOrFail({ where: { id: params.id } }, em);

    await this.billingService.createBillItems(
      params.items.map((item) => ({
        billId: params.id,
        serviceId: item.serviceId,
        description: item.serviceDescription,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        discount: item.discount ?? 0,
        taxAmount: item.taxAmount ?? 0,
        totalAmount: item.unitPrice * item.quantity - (item.discount ?? 0) + (item.taxAmount ?? 0),
        hmoStatus: item.hmoStatus ?? null,
        hmoCoveredAmount: item.hmoCoveredAmount ?? null,
        patientLiabilityAmount: item.patientLiabilityAmount ?? null,
        hmoContractId: item.hmoContractId ?? null,
        isOptedOutOfHMO: false,
      })),
      em,
    );

    // Recalculate bill totals
    const allItems = await this.billingService.findItemsByBillId(params.id, em);
    const subtotal = allItems.reduce((sum, i) => sum + Number(i.unitPrice) * i.quantity, 0);
    const discount = allItems.reduce((sum, i) => sum + Number(i.discount), 0);
    const tax = allItems.reduce((sum, i) => sum + Number(i.taxAmount), 0);
    const total = subtotal - discount + tax;
    const balance = total - Number(existing.amountPaid);

    const bill = await this.billingService.updateBill(
      { id: params.id },
      { subtotal, discount, tax, total, balance },
      em,
    );

    await this.eventService.log(
      {
        actorId: this.requestContextService.getUserId(),
        event: EventType.BILL_ITEMS_UPDATED,
        module: EventModule.BILLING,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { billId: params.id, itemCount: params.items.length },
      },
      em,
    );

    return { bill };
  }
}
