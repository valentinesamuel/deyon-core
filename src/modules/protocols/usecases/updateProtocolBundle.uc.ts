import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { UpdateProtocolBundleDto } from '../dto/updateProtocolBundle.dto';
import { ProtocolBundleService } from '../service/protocolBundle.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';

type TUpdateProtocolBundleParams = { id: string; dto: UpdateProtocolBundleDto };

type TUpdateProtocolBundleResult = {
  bundle: {
    id: string;
    updatedAt: Date;
    name: string;
    medicalCodeId: string;
  };
};

@Injectable()
export class UpdateProtocolBundleUsecase extends Usecase<
  TUpdateProtocolBundleResult,
  TUpdateProtocolBundleParams
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
    params: TUpdateProtocolBundleParams,
  ): Promise<TUpdateProtocolBundleResult> {
    const { id, dto } = params;

    await this.protocolBundleService.getProtocolBundleByDataOrFailIfNotExists(
      { where: { id } },
      em,
    );

    const updated = await this.protocolBundleService.updateProtocolBundle(id, dto, em);

    const actorId = this.requestContextService.getUserId();

    await this.eventService.log(
      {
        actorId,
        event: EventType.PROTOCOL_BUNDLE_UPDATED,
        module: EventModule.PROTOCOL_BUNDLE,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { bundleId: id, ...dto },
      },
      em,
    );

    return {
      bundle: {
        id: updated.id,
        updatedAt: updated.updatedAt,
        name: updated.name,
        medicalCodeId: updated.medicalCodeId,
      },
    };
  }
}
