import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CreateProtocolBundleDto } from '../dto/createProtocolBundle.dto';
import { ProtocolBundleService } from '../service/protocolBundle.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { MedicalCode } from '@modules/core/entities/medicalCode.entity';

type TCreateProtocolBundleResult = {
  id: string;
  createdAt: Date;
  name: string;
  medicalCodeId: string;
};

@Injectable()
export class CreateProtocolBundleUsecase extends Usecase<
  TCreateProtocolBundleResult,
  CreateProtocolBundleDto
> {
  readonly config = { requiresTransaction: true };

  constructor(
    private readonly protocolBundleService: ProtocolBundleService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(
    em: EntityManager,
    params: CreateProtocolBundleDto,
  ): Promise<TCreateProtocolBundleResult> {
    const medicalCode = await em
      .getRepository(MedicalCode)
      .findOne({ where: { id: params.medicalCodeId } });

    if (!medicalCode) {
      throw new NotFoundException('Medical code not found');
    }

    const bundle = await this.protocolBundleService.createProtocolBundle(
      {
        name: params.name,
        medicalCodeId: params.medicalCodeId,
      },
      em,
    );

    const actorId = this.requestContextService.getUserId();

    await this.eventService.log(
      {
        actorId,
        event: EventType.PROTOCOL_BUNDLE_CREATED,
        module: EventModule.PROTOCOL_BUNDLE,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { bundleId: bundle.id, name: bundle.name, medicalCodeId: bundle.medicalCodeId },
      },
      em,
    );

    return {
      id: bundle.id,
      createdAt: bundle.createdAt,
      name: bundle.name,
      medicalCodeId: bundle.medicalCodeId,
    };
  }
}
