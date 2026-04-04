import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { AdjustInventoryStockDto } from '../dto/adjustInventoryStock.dto';
import { InventoryService } from '../service/inventory.service';
import { StockAdjustmentService } from '../service/stockAdjustment.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { StockAdjustmentTypeEnum } from '@modules/core/entities/stockAdjustment.entity';

type TAdjustInventoryStockParams = { id: string; dto: AdjustInventoryStockDto };

type TAdjustInventoryStockResult = {
  id: string;
  currentStock: number;
  adjustment: {
    id: string;
    adjustmentType: StockAdjustmentTypeEnum;
    quantity: number;
  };
};

@Injectable()
export class AdjustInventoryStockUsecase extends Usecase<
  TAdjustInventoryStockResult,
  TAdjustInventoryStockParams
> {
  readonly config = { requiresTransaction: true };

  constructor(
    private readonly inventoryService: InventoryService,
    private readonly stockAdjustmentService: StockAdjustmentService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(
    em: EntityManager,
    params: TAdjustInventoryStockParams,
  ): Promise<TAdjustInventoryStockResult> {
    const { id, dto } = params;

    const inventory = await this.inventoryService.getInventoryByDataOrFailIfNotExists(
      { where: { id } },
      em,
    );

    const newStock = inventory.currentStock + dto.quantity;

    await this.inventoryService.updateInventoryItem(id, { currentStock: newStock }, em);

    const performedBy = this.requestContextService.getUserId();

    const adjustment = await this.stockAdjustmentService.createStockAdjustment(
      {
        inventoryId: id,
        adjustmentType: dto.adjustmentType,
        quantity: dto.quantity,
        reason: dto.reason,
        referenceId: dto.referenceId ?? undefined,
        performedBy,
      },
      em,
    );

    await this.eventService.log(
      {
        actorId: performedBy,
        event: EventType.INVENTORY_STOCK_ADJUSTED,
        module: EventModule.INVENTORY,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: {
          inventoryId: id,
          adjustmentType: dto.adjustmentType,
          quantity: dto.quantity,
          reason: dto.reason,
          newStock,
        },
      },
      em,
    );

    return {
      id: inventory.id,
      currentStock: newStock,
      adjustment: {
        id: adjustment.id,
        adjustmentType: dto.adjustmentType,
        quantity: dto.quantity,
      },
    };
  }
}
