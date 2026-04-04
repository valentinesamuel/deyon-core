import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CreatePrescriptionDto } from '../dto/createPrescription.dto';
import { PrescriptionService } from '../service/prescription.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { Prescription, PrescriptionStatusEnum } from '@modules/core/entities/prescription.entity';

type TResult = { prescription: Prescription };

@Injectable()
export class CreatePrescriptionUsecase extends Usecase<TResult, CreatePrescriptionDto> {
  constructor(
    private readonly prescriptionService: PrescriptionService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: CreatePrescriptionDto): Promise<TResult> {
    const prescription = await this.prescriptionService.createPrescription(
      {
        patientId: params.patientId,
        doctorId: params.doctorId,
        status: PrescriptionStatusEnum.PENDING,
        notes: params.notes,
      },
      em,
    );

    await this.prescriptionService.createPrescriptionItems(
      params.items.map((item) => ({
        prescriptionId: prescription.id,
        drugId: item.drugId,
        dosageValue: item.dosageValue,
        dosageUnit: item.dosageUnit,
        frequencyValue: item.frequencyValue,
        frequencyUnit: item.frequencyUnit,
        durationValue: item.durationValue,
        durationUnit: item.durationUnit,
        prescribedQuantity: item.prescribedQuantity,
        dispensedQuantity: 0,
      })),
      em,
    );

    await this.eventService.log(
      {
        actorId: this.requestContextService.getUserId(),
        event: EventType.PRESCRIPTION_CREATED,
        module: EventModule.PRESCRIPTION,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { prescriptionId: prescription.id, patientId: params.patientId },
      },
      em,
    );

    return { prescription };
  }
}
