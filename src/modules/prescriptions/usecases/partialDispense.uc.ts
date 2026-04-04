import { Injectable, BadRequestException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { PartialDispenseDto } from '../dto/partialDispense.dto';
import { PrescriptionService } from '../service/prescription.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { Prescription, PrescriptionStatusEnum } from '@modules/core/entities/prescription.entity';
import { PrescriptionItem } from '@modules/core/entities/prescriptionItem.entity';
import { Inventory } from '@modules/core/entities/inventory.entity';

type TParams = { id: string } & PartialDispenseDto;
type TResult = { prescription: Prescription };

@Injectable()
export class PartialDispenseUsecase extends Usecase<TResult, TParams> {
  constructor(
    private readonly prescriptionService: PrescriptionService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: TParams): Promise<TResult> {
    const existing = await this.prescriptionService.getPrescriptionOrFail(
      { where: { id: params.id } },
      em,
    );

    const dispensableStatuses: PrescriptionStatusEnum[] = [
      PrescriptionStatusEnum.PENDING,
      PrescriptionStatusEnum.PARTIAL,
    ];

    if (!dispensableStatuses.includes(existing.status)) {
      throw new BadRequestException(
        `Cannot partially dispense a prescription in status '${existing.status}'.`,
      );
    }

    const prescriptionItemRepo = em.getRepository(PrescriptionItem);
    const inventoryRepo = em.getRepository(Inventory);

    for (const dispenseItem of params.items) {
      const item = await this.prescriptionService.getItemOrFail(
        { where: { id: dispenseItem.prescriptionItemId, prescriptionId: params.id } },
        em,
      );

      const remainingQuantity = item.prescribedQuantity - item.dispensedQuantity;
      if (dispenseItem.quantity > remainingQuantity) {
        throw new BadRequestException(
          `Cannot dispense ${dispenseItem.quantity} units for item ${item.id}. Only ${remainingQuantity} remaining.`,
        );
      }

      const drugId = dispenseItem.substitutedDrugId ?? item.drugId;
      const drug = await inventoryRepo.findOne({ where: { id: drugId } });

      if (!drug) {
        throw new BadRequestException(`Drug with id '${drugId}' not found in inventory.`);
      }

      if (drug.currentStock < dispenseItem.quantity) {
        throw new BadRequestException(
          `Insufficient stock for drug '${drug.name}'. Available: ${drug.currentStock}, Required: ${dispenseItem.quantity}.`,
        );
      }

      await inventoryRepo.update(
        { id: drugId },
        {
          currentStock: drug.currentStock - dispenseItem.quantity,
        },
      );

      const newDispensedQty = item.dispensedQuantity + dispenseItem.quantity;

      if (dispenseItem.substitutedDrugId) {
        await prescriptionItemRepo.update(
          { id: item.id },
          {
            dispensedQuantity: newDispensedQty,
            substitutedDrugId: dispenseItem.substitutedDrugId,
            substitutedMetadata: {
              originalDrugId: item.drugId,
              substitutedAt: new Date().toISOString(),
              substitutedBy: this.requestContextService.getUserId(),
            },
          },
        );
      } else {
        await prescriptionItemRepo.update(
          { id: item.id },
          {
            dispensedQuantity: newDispensedQty,
          },
        );
      }
    }

    // Check if all items are fully dispensed → FULLY_DISPENSED, else PARTIAL
    const allItems = await this.prescriptionService.findItemsByPrescriptionId(params.id, em);
    const allFulfilled = allItems.every(
      (item) => item.dispensedQuantity >= item.prescribedQuantity,
    );

    const staffId = this.requestContextService.getUserId();
    const newStatus = allFulfilled
      ? PrescriptionStatusEnum.FULLY_DISPENSED
      : PrescriptionStatusEnum.PARTIAL;

    const prescription = await this.prescriptionService.updatePrescription(
      { id: params.id },
      {
        status: newStatus,
        dispensedBy: staffId,
        dispensedAt: allFulfilled ? new Date() : existing.dispensedAt,
        notes: params.notes ?? existing.notes,
      },
      em,
    );

    await this.eventService.log(
      {
        actorId: staffId,
        event: EventType.PRESCRIPTION_PARTIALLY_DISPENSED,
        module: EventModule.PRESCRIPTION,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { prescriptionId: params.id, newStatus },
      },
      em,
    );

    return { prescription };
  }
}
