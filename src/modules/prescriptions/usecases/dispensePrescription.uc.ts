import { Injectable, BadRequestException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { DispensePrescriptionDto } from '../dto/dispensePrescription.dto';
import { PrescriptionService } from '../service/prescription.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { Prescription, PrescriptionStatusEnum } from '@modules/core/entities/prescription.entity';
import { Inventory } from '@modules/core/entities/inventory.entity';
import { PrescriptionItem } from '@modules/core/entities/prescriptionItem.entity';

type TParams = { id: string } & DispensePrescriptionDto;
type TResult = { prescription: Prescription };

@Injectable()
export class DispensePrescriptionUsecase extends Usecase<TResult, TParams> {
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

    if (existing.status !== PrescriptionStatusEnum.PENDING) {
      throw new BadRequestException(
        `Cannot dispense a prescription in status '${existing.status}'.`,
      );
    }

    const items = await this.prescriptionService.findItemsByPrescriptionId(params.id, em);

    // Deduct stock from inventory for each item in a single transaction
    for (const item of items) {
      const inventoryRepo = em.getRepository(Inventory);
      const drug = await inventoryRepo.findOne({ where: { id: item.drugId } });

      if (!drug) {
        throw new BadRequestException(`Drug with id '${item.drugId}' not found in inventory.`);
      }

      if (drug.currentStock < item.prescribedQuantity) {
        throw new BadRequestException(
          `Insufficient stock for drug '${drug.name}'. Available: ${drug.currentStock}, Required: ${item.prescribedQuantity}.`,
        );
      }

      await inventoryRepo.update(
        { id: item.drugId },
        {
          currentStock: drug.currentStock - item.prescribedQuantity,
        },
      );

      await em
        .getRepository(PrescriptionItem)
        .update({ id: item.id }, { dispensedQuantity: item.prescribedQuantity });
    }

    const staffId = this.requestContextService.getUserId();
    const prescription = await this.prescriptionService.updatePrescription(
      { id: params.id },
      {
        status: PrescriptionStatusEnum.FULLY_DISPENSED,
        dispensedAt: new Date(),
        dispensedBy: staffId,
        notes: params.notes ?? existing.notes,
      },
      em,
    );

    await this.eventService.log(
      {
        actorId: staffId,
        event: EventType.PRESCRIPTION_DISPENSED,
        module: EventModule.PRESCRIPTION,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { prescriptionId: params.id },
      },
      em,
    );

    return { prescription };
  }
}
