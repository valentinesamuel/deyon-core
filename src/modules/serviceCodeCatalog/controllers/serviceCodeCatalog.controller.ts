import { Broker } from '@broker/broker';
import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { PERMISSION } from '@shared/constants/permissions';
import { RequirePermissions } from '@shared/decorators/requirePermission.decorator';
import { GetAllQueryDto } from '@shared/queryEngine';
import { FetchAllServiceCodeCatalogsUsecase } from '../usecases/fetchAllServiceCodeCatalogs.uc';
import { CreateServiceCodeCatalogUsecase } from '../usecases/createServiceCodeCatalog.uc';
import { FetchServiceCodeCatalogByIdUsecase } from '../usecases/fetchServiceCodeCatalogById.uc';
import { DeleteServiceCodeCatalogUsecase } from '../usecases/deleteServiceCodeCatalog.uc';
import { CreateServiceCodeCatalogDto } from '../dto/createServiceCodeCatalog.dto';

@Controller('services/:serviceId/codes')
export class ServiceCodeCatalogController {
  constructor(
    private readonly serviceBroker: Broker,
    private readonly fetchAllServiceCodeCatalogsUsecase: FetchAllServiceCodeCatalogsUsecase,
    private readonly createServiceCodeCatalogUsecase: CreateServiceCodeCatalogUsecase,
    private readonly fetchServiceCodeCatalogByIdUsecase: FetchServiceCodeCatalogByIdUsecase,
    private readonly deleteServiceCodeCatalogUsecase: DeleteServiceCodeCatalogUsecase,
  ) {}

  @Get('')
  @RequirePermissions([PERMISSION.SERVICE_CODE_CATALOG.LIST])
  async getAllServiceCodeCatalogs(
    @Param('serviceId') serviceId: string,
    @Query() query: GetAllQueryDto,
  ) {
    return this.serviceBroker.runUsecases([this.fetchAllServiceCodeCatalogsUsecase], {
      serviceId,
      query,
    });
  }

  @Post('')
  @RequirePermissions([PERMISSION.SERVICE_CODE_CATALOG.CREATE])
  async createServiceCodeCatalog(
    @Param('serviceId') serviceId: string,
    @Body() dto: CreateServiceCodeCatalogDto,
  ) {
    return this.serviceBroker.runUsecases([this.createServiceCodeCatalogUsecase], {
      serviceId,
      dto,
    });
  }

  @Get(':catalogId')
  @RequirePermissions([PERMISSION.SERVICE_CODE_CATALOG.READ])
  async getServiceCodeCatalogById(
    @Param('serviceId') serviceId: string,
    @Param('catalogId') catalogId: string,
  ) {
    return this.serviceBroker.runUsecases([this.fetchServiceCodeCatalogByIdUsecase], {
      serviceId,
      catalogId,
    });
  }

  @Delete(':catalogId')
  @RequirePermissions([PERMISSION.SERVICE_CODE_CATALOG.DELETE])
  async deleteServiceCodeCatalog(
    @Param('serviceId') serviceId: string,
    @Param('catalogId') catalogId: string,
  ) {
    return this.serviceBroker.runUsecases([this.deleteServiceCodeCatalogUsecase], {
      serviceId,
      catalogId,
    });
  }
}
