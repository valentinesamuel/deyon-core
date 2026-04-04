import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { ProtocolBundleService } from '../service/protocolBundle.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';

type TDeleteProtocolBundleParams = { id: string };

type TDeleteProtocolBundleResult = {
  id: string;
  deletedAt: Date;
};

@Injectable()
export class DeleteProtocolBundleUsecase extends Usecase<
  TDeleteProtocolBundleResult,
  TDeleteProtocolBundleParams
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
    params: TDeleteProtocolBundleParams,
  ): Promise<TDeleteProtocolBundleResult> {
    const { id } = params;

    await this.protocolBundleService.getProtocolBundleByDataOrFailIfNotExists(
      { where: { id } },
      em,
    );

    await this.protocolBundleService.softDeleteProtocolBundle(id, em);

    const actorId = this.requestContextService.getUserId();

    await this.eventService.log(
      {
        actorId,
        event: EventType.PROTOCOL_BUNDLE_DELETED,
        module: EventModule.PROTOCOL_BUNDLE,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { bundleId: id },
      },
      em,
    );

    return {
      id,
      deletedAt: new Date(),
    };
  }
}
