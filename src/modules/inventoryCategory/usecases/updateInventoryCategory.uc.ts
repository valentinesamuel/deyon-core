import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { InventoryCategoryService } from '../service/inventoryCategory.service';
import { UpdateInventoryCategoryDto } from '../dto/updateInventoryCategory.dto';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';

type TUpdateInventoryCategoryResult = {
  inventoryCategory: {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    name: string;
  };
};

type TUpdateInventoryCategoryParams = { id: string; dto: UpdateInventoryCategoryDto };

@Injectable()
export class UpdateInventoryCategoryUsecase extends Usecase<
  TUpdateInventoryCategoryResult,
  TUpdateInventoryCategoryParams
> {
  readonly config = { requiresTransaction: true };

  constructor(
    private readonly inventoryCategoryService: InventoryCategoryService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(
    em: EntityManager,
    params: TUpdateInventoryCategoryParams,
  ): Promise<TUpdateInventoryCategoryResult> {
    const { id, dto } = params;

    const updated = await this.inventoryCategoryService.updateInventoryCategory(
      id,
      {
        name: dto.name,
      },
      em,
    );

    const actorId = this.requestContextService.getUserId();

    await this.eventService.log(
      {
        actorId,
        event: EventType.INVENTORY_CATEGORY_UPDATED,
        module: EventModule.INVENTORY_CATEGORY,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { id },
      },
      em,
    );

    return {
      inventoryCategory: {
        id: updated.id,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
        name: updated.name,
      },
    };
  }
}
