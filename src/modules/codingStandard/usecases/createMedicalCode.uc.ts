import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CreateMedicalCodeDto } from '../dto/createMedicalCode.dto';
import { MedicalCodeService } from '../service/medicalCode.service';
import { CodingStandardService } from '../service/codingStandard.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';

type TCreateMedicalCodeParams = { standardId: string; dto: CreateMedicalCodeDto };

type TCreateMedicalCodeResult = {
  id: string;
  standardId: string;
  codeValue: string;
  description: string;
  createdAt: Date;
};

@Injectable()
export class CreateMedicalCodeUsecase extends Usecase<
  TCreateMedicalCodeResult,
  TCreateMedicalCodeParams
> {
  constructor(
    private readonly medicalCodeService: MedicalCodeService,
    private readonly codingStandardService: CodingStandardService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(
    em: EntityManager,
    params: TCreateMedicalCodeParams,
  ): Promise<TCreateMedicalCodeResult> {
    const { standardId, dto } = params;

    await this.codingStandardService.getCodingStandardByDataOrFailIfNotExists(
      { where: { id: standardId } },
      em,
    );

    const newCode = await this.medicalCodeService.createMedicalCode(
      {
        standardId,
        codeValue: dto.codeValue,
        description: dto.description,
      },
      em,
    );

    const actorId = this.requestContextService.getUserId();

    await this.eventService.log(
      {
        actorId,
        event: EventType.MEDICAL_CODE_CREATED,
        module: EventModule.MEDICAL_CODE,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: {
          standardId,
          codeValue: dto.codeValue,
        },
      },
      em,
    );

    return {
      id: newCode.id,
      standardId: newCode.standardId,
      codeValue: newCode.codeValue,
      description: newCode.description,
      createdAt: newCode.createdAt,
    };
  }
}
