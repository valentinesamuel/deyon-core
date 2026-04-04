import { Module } from '@nestjs/common';
import { InventoryController } from './controllers/inventory.controller';
import { FetchAllInventoryUsecase } from './usecases/fetchAllInventory.uc';
import { FetchLowStockInventoryUsecase } from './usecases/fetchLowStockInventory.uc';
import { FetchExpiringInventoryUsecase } from './usecases/fetchExpiringInventory.uc';
import { CreateInventoryItemUsecase } from './usecases/createInventoryItem.uc';
import { FetchInventoryItemByIdUsecase } from './usecases/fetchInventoryItemById.uc';
import { UpdateInventoryItemUsecase } from './usecases/updateInventoryItem.uc';
import { AdjustInventoryStockUsecase } from './usecases/adjustInventoryStock.uc';
import { InventoryService } from './service/inventory.service';
import { StockAdjustmentService } from './service/stockAdjustment.service';
import { InventoryRepository } from '@adapters/repositories/inventory.repository';
import { StockAdjustmentRepository } from '@adapters/repositories/stockAdjustment.repository';

@Module({
  controllers: [InventoryController],
  providers: [
    // Usecases
    FetchAllInventoryUsecase,
    FetchLowStockInventoryUsecase,
    FetchExpiringInventoryUsecase,
    CreateInventoryItemUsecase,
    FetchInventoryItemByIdUsecase,
    UpdateInventoryItemUsecase,
    AdjustInventoryStockUsecase,

    // Services
    InventoryService,
    StockAdjustmentService,

    // Repositories
    InventoryRepository,
    StockAdjustmentRepository,
  ],
})
export class InventoryModule {}
