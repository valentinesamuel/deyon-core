import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { MedicalCodeService } from '../service/medicalCode.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';

type TDeleteMedicalCodeParams = { id: string };

@Injectable()
export class DeleteMedicalCodeUsecase extends Usecase<void, TDeleteMedicalCodeParams> {
  readonly config = { requiresTransaction: true };

  constructor(
    private readonly medicalCodeService: MedicalCodeService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: TDeleteMedicalCodeParams): Promise<void> {
    const { id } = params;

    await this.medicalCodeService.getMedicalCodeByDataOrFailIfNotExists({ where: { id } }, em);

    await this.medicalCodeService.softDeleteMedicalCode(id, em);

    const actorId = this.requestContextService.getUserId();

    await this.eventService.log(
      {
        actorId,
        event: EventType.MEDICAL_CODE_DELETED,
        module: EventModule.MEDICAL_CODE,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: {
          id,
        },
      },
      em,
    );
  }
}
