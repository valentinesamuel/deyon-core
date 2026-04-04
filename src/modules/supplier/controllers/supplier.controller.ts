import { Broker } from '@broker/broker';
import { Body, Controller, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { PERMISSION } from '@shared/constants/permissions';
import { RequirePermissions } from '@shared/decorators/requirePermission.decorator';
import { GetAllQueryDto } from '@shared/queryEngine';
import { FetchAllSuppliersUsecase } from '../usecases/fetchAllSuppliers.uc';
import { CreateSupplierUsecase } from '../usecases/createSupplier.uc';
import { CreateSupplierDto } from '../dto/createSupplier.dto';
import { UpdateSupplierDto } from '../dto/updateSupplier.dto';
import { UpdateSupplierStatusDto } from '../dto/updateSupplierStatus.dto';
import { FetchSupplierByIdUsecase } from '../usecases/fetchSupplierById.uc';
import { UpdateSupplierUsecase } from '../usecases/updateSupplier.uc';
import { ToggleSupplierStatusUsecase } from '../usecases/toggleSupplierStatus.uc';

@Controller('suppliers')
export class SupplierController {
  constructor(
    private readonly serviceBroker: Broker,
    private readonly fetchAllSuppliersUsecase: FetchAllSuppliersUsecase,
    private readonly fetchSupplierByIdUsecase: FetchSupplierByIdUsecase,
    private readonly createSupplierUsecase: CreateSupplierUsecase,
    private readonly updateSupplierUsecase: UpdateSupplierUsecase,
    private readonly toggleSupplierStatusUsecase: ToggleSupplierStatusUsecase,
  ) {}

  @Get('')
  @RequirePermissions([PERMISSION.SUPPLIER.LIST])
  async getAllSuppliers(@Query() query: GetAllQueryDto) {
    return this.serviceBroker.runUsecases([this.fetchAllSuppliersUsecase], { query });
  }

  @Get(':id')
  @RequirePermissions([PERMISSION.SUPPLIER.READ])
  async getSupplierById(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.fetchSupplierByIdUsecase], { id });
  }

  @Post('')
  @RequirePermissions([PERMISSION.SUPPLIER.CREATE])
  async createSupplier(@Body() dto: CreateSupplierDto) {
    return this.serviceBroker.runUsecases([this.createSupplierUsecase], dto);
  }

  @Put(':id')
  @RequirePermissions([PERMISSION.SUPPLIER.UPDATE])
  async updateSupplier(@Param('id') id: string, @Body() dto: UpdateSupplierDto) {
    return this.serviceBroker.runUsecases([this.updateSupplierUsecase], { id, dto });
  }

  @Patch(':id/status')
  @RequirePermissions([PERMISSION.SUPPLIER.UPDATE])
  async toggleSupplierStatus(@Param('id') id: string, @Body() dto: UpdateSupplierStatusDto) {
    return this.serviceBroker.runUsecases([this.toggleSupplierStatusUsecase], { id, dto });
  }
}
