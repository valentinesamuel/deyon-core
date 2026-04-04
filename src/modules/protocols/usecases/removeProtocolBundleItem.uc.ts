import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { ProtocolBundleItems } from '@modules/core/entities/protocolBundleItems.entity';

type TRemoveProtocolBundleItemParams = { bundleId: string; itemId: string };

type TRemoveProtocolBundleItemResult = {
  id: string;
  deletedAt: Date;
};

@Injectable()
export class RemoveProtocolBundleItemUsecase extends Usecase<
  TRemoveProtocolBundleItemResult,
  TRemoveProtocolBundleItemParams
> {
  readonly config = { requiresTransaction: true };

  constructor(
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(
    em: EntityManager,
    params: TRemoveProtocolBundleItemParams,
  ): Promise<TRemoveProtocolBundleItemResult> {
    const { bundleId, itemId } = params;

    const item = await em
      .getRepository(ProtocolBundleItems)
      .findOne({ where: { id: itemId, bundleId } });

    if (!item) {
      throw new NotFoundException('Protocol bundle item not found');
    }

    await em.getRepository(ProtocolBundleItems).softRemove(item);

    const actorId = this.requestContextService.getUserId();

    await this.eventService.log(
      {
        actorId,
        event: EventType.PROTOCOL_BUNDLE_ITEM_REMOVED,
        module: EventModule.PROTOCOL_BUNDLE,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { itemId, bundleId },
      },
      em,
    );

    return {
      id: itemId,
      deletedAt: new Date(),
    };
  }
}
