import { Broker } from '@broker/broker';
import { Controller, Get, Query } from '@nestjs/common';
import { PERMISSION } from '@shared/constants/permissions';
import { RequirePermissions } from '@shared/decorators/requirePermission.decorator';
import { GetAllQueryDto } from '@shared/queryEngine';
import { FetchAllHmoProvidersUsecase } from '../usecases/fetchAllHmoProviders.uc';

@Controller('hmo/providers')
export class HmoProvidersController {
  constructor(
    private readonly serviceBroker: Broker,
    private readonly fetchAllHmoProvidersUsecase: FetchAllHmoProvidersUsecase,
  ) {}

  @Get('')
  @RequirePermissions([PERMISSION.HMO_PROVIDER.LIST])
  async getAllHmoProviders(@Query() query: GetAllQueryDto) {
    return this.serviceBroker.runUsecases([this.fetchAllHmoProvidersUsecase], { query });
  }
}
