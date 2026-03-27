import { Broker } from '@broker/broker';
import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { PERMISSION } from '@shared/constants/permissions';
import { RequirePermissions } from '@shared/decorators/requirePermission.decorator';
import { GetAllQueryDto } from '@shared/queryEngine';
import { FetchAllHmoProvidersUsecase } from '../usecases/fetchAllHmoProviders.uc';
import { CreateHmoProviderUsecase } from '../usecases/createHmoProvider.uc';
import { CreateHmoProviderDto } from '../dto.createHmoProvider.dto';

@Controller('hmo/providers')
export class HmoProvidersController {
  constructor(
    private readonly serviceBroker: Broker,
    private readonly fetchAllHmoProvidersUsecase: FetchAllHmoProvidersUsecase,
    private readonly createHmoProviderUsecase: CreateHmoProviderUsecase,
  ) {}

  @Get('')
  @RequirePermissions([PERMISSION.HMO_PROVIDER.LIST])
  async getAllHmoProviders(@Query() query: GetAllQueryDto) {
    return this.serviceBroker.runUsecases([this.fetchAllHmoProvidersUsecase], { query });
  }

  @Post('')
  @RequirePermissions([PERMISSION.HMO_PROVIDER.CREATE])
  async createHmoProvider(@Body() dto: CreateHmoProviderDto) {
    return this.serviceBroker.runUsecases([this.createHmoProviderUsecase], dto);
  }
}
