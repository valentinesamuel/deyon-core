import { Injectable, BadRequestException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { MarkUnfulfillableDto } from '../dto/markUnfulfillable.dto';
import { PrescriptionService } from '../service/prescription.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { Prescription, PrescriptionStatusEnum } from '@modules/core/entities/prescription.entity';

type TParams = { id: string } & MarkUnfulfillableDto;
type TResult = { prescription: Prescription };

@Injectable()
export class MarkUnfulfillableUsecase extends Usecase<TResult, TParams> {
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

    const markableStatuses: PrescriptionStatusEnum[] = [
      PrescriptionStatusEnum.PENDING,
      PrescriptionStatusEnum.PARTIAL,
    ];

    if (!markableStatuses.includes(existing.status)) {
      throw new BadRequestException(
        `Cannot mark prescription as unfulfillable in status '${existing.status}'.`,
      );
    }

    const prescription = await this.prescriptionService.updatePrescription(
      { id: params.id },
      {
        status: PrescriptionStatusEnum.CANCELLED,
        auditLog: [
          ...(existing.auditLog ?? []),
          {
            action: 'MARKED_UNFULFILLABLE',
            reason: params.reason,
            by: this.requestContextService.getUserId(),
            at: new Date().toISOString(),
          },
        ],
      },
      em,
    );

    await this.eventService.log(
      {
        actorId: this.requestContextService.getUserId(),
        event: EventType.PRESCRIPTION_UNFULFILLABLE,
        module: EventModule.PRESCRIPTION,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { prescriptionId: params.id, reason: params.reason },
      },
      em,
    );

    return { prescription };
  }
}
