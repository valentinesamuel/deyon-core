import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { UpdateInventoryItemDto } from '../dto/updateInventoryItem.dto';
import { InventoryService } from '../service/inventory.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';

type TUpdateInventoryItemParams = { id: string; dto: UpdateInventoryItemDto };

type TUpdateInventoryItemResult = {
  id: string;
  updatedAt: Date;
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
export class UpdateInventoryItemUsecase extends Usecase<
  TUpdateInventoryItemResult,
  TUpdateInventoryItemParams
> {
  readonly config = { requiresTransaction: true };

  constructor(
    private readonly inventoryService: InventoryService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(
    em: EntityManager,
    params: TUpdateInventoryItemParams,
  ): Promise<TUpdateInventoryItemResult> {
    const { id, dto } = params;

    await this.inventoryService.getInventoryByDataOrFailIfNotExists({ where: { id } }, em);

    const updateData: Record<string, unknown> = { ...dto };
    if (dto.expiryDate !== undefined) {
      updateData.expiryDate = dto.expiryDate ? new Date(dto.expiryDate) : null;
    }

    const updated = await this.inventoryService.updateInventoryItem(id, updateData, em);

    const actorId = this.requestContextService.getUserId();

    await this.eventService.log(
      {
        actorId,
        event: EventType.INVENTORY_ITEM_UPDATED,
        module: EventModule.INVENTORY,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { inventoryId: id, ...dto },
      },
      em,
    );

    return {
      id: updated.id,
      updatedAt: updated.updatedAt,
      categoryId: updated.categoryId,
      supplierId: updated.supplierId ?? null,
      name: updated.name,
      unit: updated.unit,
      currentStock: updated.currentStock,
      reorderLevel: updated.reorderLevel,
      unitCost: updated.unitCost,
      expiryDate: updated.expiryDate ?? null,
      location: updated.location ?? null,
    };
  }
}
