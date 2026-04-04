import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { AddProtocolBundleItemDto } from '../dto/addProtocolBundleItem.dto';
import { ProtocolBundleService } from '../service/protocolBundle.service';
import { ProtocolBundleItemService } from '../service/protocolBundleItem.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { ServiceCategoryEnum } from '@modules/core/entities/protocolBundleItems.entity';

type TAddProtocolBundleItemParams = { bundleId: string; dto: AddProtocolBundleItemDto };

type TAddProtocolBundleItemResult = {
  id: string;
  createdAt: Date;
  bundleId: string;
  serviceType: ServiceCategoryEnum;
  serviceId: string;
  isCompulsory: boolean;
};

@Injectable()
export class AddProtocolBundleItemUsecase extends Usecase<
  TAddProtocolBundleItemResult,
  TAddProtocolBundleItemParams
> {
  readonly config = { requiresTransaction: true };

  constructor(
    private readonly protocolBundleService: ProtocolBundleService,
    private readonly protocolBundleItemService: ProtocolBundleItemService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(
    em: EntityManager,
    params: TAddProtocolBundleItemParams,
  ): Promise<TAddProtocolBundleItemResult> {
    const { bundleId, dto } = params;

    await this.protocolBundleService.getProtocolBundleByDataOrFailIfNotExists(
      { where: { id: bundleId } },
      em,
    );

    const item = await this.protocolBundleItemService.createProtocolBundleItem(
      {
        bundleId,
        serviceType: dto.serviceType,
        serviceId: dto.serviceId,
        isCompulsory: dto.isCompulsory,
      },
      em,
    );

    const actorId = this.requestContextService.getUserId();

    await this.eventService.log(
      {
        actorId,
        event: EventType.PROTOCOL_BUNDLE_ITEM_ADDED,
        module: EventModule.PROTOCOL_BUNDLE,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: {
          itemId: item.id,
          bundleId,
          serviceId: dto.serviceId,
          serviceType: dto.serviceType,
        },
      },
      em,
    );

    return {
      id: item.id,
      createdAt: item.createdAt,
      bundleId: item.bundleId,
      serviceType: item.serviceType,
      serviceId: item.serviceId,
      isCompulsory: item.isCompulsory,
    };
  }
}
