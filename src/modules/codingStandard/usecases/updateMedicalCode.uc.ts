import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { UpdateMedicalCodeDto } from '../dto/updateMedicalCode.dto';
import { MedicalCodeService } from '../service/medicalCode.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { MedicalCode } from '@modules/core/entities/medicalCode.entity';

type TUpdateMedicalCodeParams = { id: string; dto: UpdateMedicalCodeDto };

@Injectable()
export class UpdateMedicalCodeUsecase extends Usecase<MedicalCode, TUpdateMedicalCodeParams> {
  readonly config = { requiresTransaction: true };

  constructor(
    private readonly medicalCodeService: MedicalCodeService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: TUpdateMedicalCodeParams): Promise<MedicalCode> {
    const { id, dto } = params;

    await this.medicalCodeService.getMedicalCodeByDataOrFailIfNotExists({ where: { id } }, em);

    const updated = await this.medicalCodeService.updateMedicalCode(
      id,
      {
        codeValue: dto.codeValue,
        description: dto.description,
        standardId: dto.standardId,
      },
      em,
    );

    const actorId = this.requestContextService.getUserId();

    await this.eventService.log(
      {
        actorId,
        event: EventType.MEDICAL_CODE_UPDATED,
        module: EventModule.MEDICAL_CODE,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: {
          id,
          codeValue: dto.codeValue,
        },
      },
      em,
    );

    return updated;
  }
}
