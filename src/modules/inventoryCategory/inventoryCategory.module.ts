import { Module } from '@nestjs/common';
import { InventoryCategoryController } from './controllers/inventoryCategory.controller';
import { FetchAllInventoryCategoriesUsecase } from './usecases/fetchAllInventoryCategories.uc';
import { CreateInventoryCategoryUsecase } from './usecases/createInventoryCategory.uc';
import { FetchInventoryCategoryByIdUsecase } from './usecases/fetchInventoryCategoryById.uc';
import { UpdateInventoryCategoryUsecase } from './usecases/updateInventoryCategory.uc';
import { InventoryCategoryService } from './service/inventoryCategory.service';
import { InventoryCategoryRepository } from '@adapters/repositories/inventoryCategory.repository';

@Module({
  controllers: [InventoryCategoryController],
  providers: [
    FetchAllInventoryCategoriesUsecase,
    CreateInventoryCategoryUsecase,
    FetchInventoryCategoryByIdUsecase,
    UpdateInventoryCategoryUsecase,
    InventoryCategoryService,
    InventoryCategoryRepository,
  ],
})
export class InventoryCategoryModule {}
