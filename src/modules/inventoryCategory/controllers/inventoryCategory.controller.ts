import { Broker } from '@broker/broker';
import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { PERMISSION } from '@shared/constants/permissions';
import { RequirePermissions } from '@shared/decorators/requirePermission.decorator';
import { GetAllQueryDto } from '@shared/queryEngine';
import { FetchAllInventoryCategoriesUsecase } from '../usecases/fetchAllInventoryCategories.uc';
import { CreateInventoryCategoryUsecase } from '../usecases/createInventoryCategory.uc';
import { FetchInventoryCategoryByIdUsecase } from '../usecases/fetchInventoryCategoryById.uc';
import { UpdateInventoryCategoryUsecase } from '../usecases/updateInventoryCategory.uc';
import { CreateInventoryCategoryDto } from '../dto/createInventoryCategory.dto';
import { UpdateInventoryCategoryDto } from '../dto/updateInventoryCategory.dto';

@Controller('inventory/categories')
export class InventoryCategoryController {
  constructor(
    private readonly serviceBroker: Broker,
    private readonly fetchAllInventoryCategoriesUsecase: FetchAllInventoryCategoriesUsecase,
    private readonly createInventoryCategoryUsecase: CreateInventoryCategoryUsecase,
    private readonly fetchInventoryCategoryByIdUsecase: FetchInventoryCategoryByIdUsecase,
    private readonly updateInventoryCategoryUsecase: UpdateInventoryCategoryUsecase,
  ) {}

  @Get('')
  @RequirePermissions([PERMISSION.INVENTORY_CATEGORY.LIST])
  async getAllInventoryCategories(@Query() query: GetAllQueryDto) {
    return this.serviceBroker.runUsecases([this.fetchAllInventoryCategoriesUsecase], { query });
  }

  @Get(':id')
  @RequirePermissions([PERMISSION.INVENTORY_CATEGORY.READ])
  async getInventoryCategoryById(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.fetchInventoryCategoryByIdUsecase], { id });
  }

  @Post('')
  @RequirePermissions([PERMISSION.INVENTORY_CATEGORY.CREATE])
  async createInventoryCategory(@Body() dto: CreateInventoryCategoryDto) {
    return this.serviceBroker.runUsecases([this.createInventoryCategoryUsecase], dto);
  }

  @Put(':id')
  @RequirePermissions([PERMISSION.INVENTORY_CATEGORY.UPDATE])
  async updateInventoryCategory(@Param('id') id: string, @Body() dto: UpdateInventoryCategoryDto) {
    return this.serviceBroker.runUsecases([this.updateInventoryCategoryUsecase], { id, dto });
  }
}
