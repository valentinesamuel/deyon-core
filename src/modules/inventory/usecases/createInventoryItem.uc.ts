import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CreateInventoryItemDto } from '../dto/createInventoryItem.dto';
import { InventoryService } from '../service/inventory.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';

type TCreateInventoryItemParams = CreateInventoryItemDto;

type TCreateInventoryItemResult = {
  id: string;
  createdAt: Date;
  categoryId: string;
  supplierId: string | null;
  name: string;
  unit: string;
  currentStock: number;
  reorderLevel: number;
  unitCost: number;
  expiryDate: Date | null;
  location: string | null;
};

@Injectable()
export class CreateInventoryItemUsecase extends Usecase<
  TCreateInventoryItemResult,
  TCreateInventoryItemParams
> {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(
    em: EntityManager,
    params: TCreateInventoryItemParams,
  ): Promise<TCreateInventoryItemResult> {
    const item = await this.inventoryService.createInventoryItem(
      {
        categoryId: params.categoryId,
        supplierId: params.supplierId ?? undefined,
        name: params.name,
        unit: params.unit,
        currentStock: params.currentStock,
        reorderLevel: params.reorderLevel,
        unitCost: params.unitCost,
        expiryDate: params.expiryDate ? new Date(params.expiryDate) : undefined,
        location: params.location ?? undefined,
      },
      em,
    );

    const actorId = this.requestContextService.getUserId();

    await this.eventService.log(
      {
        actorId,
        event: EventType.INVENTORY_ITEM_CREATED,
        module: EventModule.INVENTORY,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: {
          name: params.name,
          categoryId: params.categoryId,
          unit: params.unit,
        },
      },
      em,
    );

    return {
      id: item.id,
      createdAt: item.createdAt,
      categoryId: item.categoryId,
      supplierId: item.supplierId ?? null,
      name: item.name,
      unit: item.unit,
      currentStock: item.currentStock,
      reorderLevel: item.reorderLevel,
      unitCost: item.unitCost,
      expiryDate: item.expiryDate ?? null,
      location: item.location ?? null,
    };
  }
}
