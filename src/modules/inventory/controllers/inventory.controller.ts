import { Broker } from '@broker/broker';
import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { PERMISSION } from '@shared/constants/permissions';
import { RequirePermissions } from '@shared/decorators/requirePermission.decorator';
import { GetAllQueryDto } from '@shared/queryEngine';
import { FetchAllInventoryUsecase } from '../usecases/fetchAllInventory.uc';
import { FetchLowStockInventoryUsecase } from '../usecases/fetchLowStockInventory.uc';
import { FetchExpiringInventoryUsecase } from '../usecases/fetchExpiringInventory.uc';
import { CreateInventoryItemUsecase } from '../usecases/createInventoryItem.uc';
import { FetchInventoryItemByIdUsecase } from '../usecases/fetchInventoryItemById.uc';
import { UpdateInventoryItemUsecase } from '../usecases/updateInventoryItem.uc';
import { AdjustInventoryStockUsecase } from '../usecases/adjustInventoryStock.uc';
import { CreateInventoryItemDto } from '../dto/createInventoryItem.dto';
import { UpdateInventoryItemDto } from '../dto/updateInventoryItem.dto';
import { AdjustInventoryStockDto } from '../dto/adjustInventoryStock.dto';

@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly serviceBroker: Broker,
    private readonly fetchAllInventoryUsecase: FetchAllInventoryUsecase,
    private readonly fetchLowStockInventoryUsecase: FetchLowStockInventoryUsecase,
    private readonly fetchExpiringInventoryUsecase: FetchExpiringInventoryUsecase,
    private readonly createInventoryItemUsecase: CreateInventoryItemUsecase,
    private readonly fetchInventoryItemByIdUsecase: FetchInventoryItemByIdUsecase,
    private readonly updateInventoryItemUsecase: UpdateInventoryItemUsecase,
    private readonly adjustInventoryStockUsecase: AdjustInventoryStockUsecase,
  ) {}

  @Get('low-stock')
  @RequirePermissions([PERMISSION.INVENTORY.LIST])
  async getLowStockInventory() {
    return this.serviceBroker.runUsecases([this.fetchLowStockInventoryUsecase], {});
  }

  @Get('expiring')
  @RequirePermissions([PERMISSION.INVENTORY.LIST])
  async getExpiringInventory() {
    return this.serviceBroker.runUsecases([this.fetchExpiringInventoryUsecase], {});
  }

  @Get('')
  @RequirePermissions([PERMISSION.INVENTORY.LIST])
  async getAllInventory(@Query() query: GetAllQueryDto) {
    return this.serviceBroker.runUsecases([this.fetchAllInventoryUsecase], { query });
  }

  @Post('')
  @RequirePermissions([PERMISSION.INVENTORY.CREATE])
  async createInventoryItem(@Body() dto: CreateInventoryItemDto) {
    return this.serviceBroker.runUsecases([this.createInventoryItemUsecase], dto);
  }

  @Get(':id')
  @RequirePermissions([PERMISSION.INVENTORY.READ])
  async getInventoryItemById(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.fetchInventoryItemByIdUsecase], { id });
  }

  @Put(':id')
  @RequirePermissions([PERMISSION.INVENTORY.UPDATE])
  async updateInventoryItem(@Param('id') id: string, @Body() dto: UpdateInventoryItemDto) {
    return this.serviceBroker.runUsecases([this.updateInventoryItemUsecase], { id, dto });
  }

  @Post(':id/adjust')
  @RequirePermissions([PERMISSION.INVENTORY.ADJUST])
  async adjustInventoryStock(@Param('id') id: string, @Body() dto: AdjustInventoryStockDto) {
    return this.serviceBroker.runUsecases([this.adjustInventoryStockUsecase], { id, dto });
  }
}
