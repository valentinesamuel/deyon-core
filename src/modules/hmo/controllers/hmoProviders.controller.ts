import { Broker } from '@broker/broker';
import { Body, Controller, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { PERMISSION } from '@shared/constants/permissions';
import { RequirePermissions } from '@shared/decorators/requirePermission.decorator';
import { GetAllQueryDto } from '@shared/queryEngine';
import { FetchAllHmoProvidersUsecase } from '../usecases/fetchAllHmoProviders.uc';
import { CreateHmoProviderUsecase } from '../usecases/createHmoProvider.uc';
import { CreateHmoProviderDto } from '../dto/createHmoProvider.dto';
import { UpdateHmoProviderDto, UpdateHmoProviderStatusDto } from '../dto/updateHmoProvider.dto';
import { FetchHmoProviderByCodeUsecase } from '../usecases/fetchHmoProviderByCode.uc';
import { UpdateHmoProviderUsecase } from '../usecases/updateHmoProvider.uc';
import { FetchHmoProviderByIdUsecase } from '../usecases/fetchHmoProviderById.uc';
import { UpdateHmoProviderStatusUsecase } from '../usecases/updateHmoProviderStatus.uc';

@Controller('hmo/providers')
export class HmoProvidersController {
  constructor(
    private readonly serviceBroker: Broker,
    private readonly fetchAllHmoProvidersUsecase: FetchAllHmoProvidersUsecase,
    private readonly fetchHmoProviderByCodeUsecase: FetchHmoProviderByCodeUsecase,
    private readonly fetchHmoProviderByIdUsecase: FetchHmoProviderByIdUsecase,
    private readonly createHmoProviderUsecase: CreateHmoProviderUsecase,
    private readonly updateHmoProviderUsecase: UpdateHmoProviderUsecase,
    private readonly updateHmoProviderStatusUsecase: UpdateHmoProviderStatusUsecase,
  ) {}

  @Get('')
  @RequirePermissions([PERMISSION.HMO_PROVIDER.LIST])
  async getAllHmoProviders(@Query() query: GetAllQueryDto) {
    return this.serviceBroker.runUsecases([this.fetchAllHmoProvidersUsecase], { query });
  }

  @Get(':code/code')
  @RequirePermissions([PERMISSION.HMO_PROVIDER.READ])
  async getHmoProviderByCode(@Param('code') code: string) {
    return this.serviceBroker.runUsecases([this.fetchHmoProviderByCodeUsecase], { code });
  }

  @Get(':id')
  @RequirePermissions([PERMISSION.HMO_PROVIDER.READ])
  async getHmoProviderById(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.fetchHmoProviderByIdUsecase], { id });
  }

  @Post('')
  @RequirePermissions([PERMISSION.HMO_PROVIDER.CREATE])
  async createHmoProvider(@Body() dto: CreateHmoProviderDto) {
    return this.serviceBroker.runUsecases([this.createHmoProviderUsecase], dto);
  }

  @Put(':id')
  @RequirePermissions([PERMISSION.HMO_PROVIDER.UPDATE])
  async updateHmoProvider(@Param('id') id: string, @Body() dto: UpdateHmoProviderDto) {
    return this.serviceBroker.runUsecases([this.updateHmoProviderUsecase], { id, dto });
  }

  @Patch(':id/status')
  @RequirePermissions([PERMISSION.HMO_PROVIDER.UPDATE])
  async toggleHmoProviderStatus(@Param('id') id: string, @Body() dto: UpdateHmoProviderStatusDto) {
    return this.serviceBroker.runUsecases([this.updateHmoProviderStatusUsecase], { id, dto });
  }
}
