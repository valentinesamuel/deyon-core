import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { UpdateMedicalServiceStatusDto } from '../dto/updateMedicalServiceStatus.dto';
import { MedicalServiceService } from '../service/medicalService.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';

type TToggleMedicalServiceStatusResult = {
  medicalService: {
    id: string;
    updatedAt: Date;
    isActive: boolean;
  };
};

type TToggleMedicalServiceStatusParams = { id: string; dto: UpdateMedicalServiceStatusDto };

@Injectable()
export class ToggleMedicalServiceStatusUsecase extends Usecase<
  TToggleMedicalServiceStatusResult,
  TToggleMedicalServiceStatusParams
> {
  readonly config = { requiresTransaction: true };

  constructor(
    private readonly medicalServiceService: MedicalServiceService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(
    em: EntityManager,
    params: TToggleMedicalServiceStatusParams,
  ): Promise<TToggleMedicalServiceStatusResult> {
    const { id, dto } = params;

    const updated = await this.medicalServiceService.updateMedicalService(
      id,
      { isActive: dto.isActive },
      em,
    );

    const actorId = this.requestContextService.getUserId();

    await this.eventService.log(
      {
        actorId,
        event: EventType.MEDICAL_SERVICE_STATUS_CHANGED,
        module: EventModule.MEDICAL_SERVICE,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { id, isActive: dto.isActive },
      },
      em,
    );

    return {
      medicalService: {
        id: updated.id,
        updatedAt: updated.updatedAt,
        isActive: updated.isActive,
      },
    };
  }
}
