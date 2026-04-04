import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { UpdateMedicalServiceDto } from '../dto/updateMedicalService.dto';
import { MedicalServiceService } from '../service/medicalService.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { MedicalService } from '@modules/core/entities/medicalService.entity';

type TUpdateMedicalServiceResult = {
  medicalService: MedicalService;
};

type TUpdateMedicalServiceParams = { id: string; dto: UpdateMedicalServiceDto };

@Injectable()
export class UpdateMedicalServiceUsecase extends Usecase<
  TUpdateMedicalServiceResult,
  TUpdateMedicalServiceParams
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
    params: TUpdateMedicalServiceParams,
  ): Promise<TUpdateMedicalServiceResult> {
    const { id, dto } = params;

    await this.medicalServiceService.getMedicalServiceByDataOrFailIfNotExists(
      { where: { id } },
      em,
    );

    const medicalService = await this.medicalServiceService.updateMedicalService(
      id,
      { ...dto },
      em,
    );

    const actorId = this.requestContextService.getUserId();

    await this.eventService.log(
      {
        actorId,
        event: EventType.MEDICAL_SERVICE_UPDATED,
        module: EventModule.MEDICAL_SERVICE,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { id },
      },
      em,
    );

    return { medicalService };
  }
}
