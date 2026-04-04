import { Broker } from '@broker/broker';
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { PERMISSION } from '@shared/constants/permissions';
import { RequirePermissions } from '@shared/decorators/requirePermission.decorator';
import { GetAllQueryDto } from '@shared/queryEngine';
import { FetchAllProtocolBundlesUsecase } from '../usecases/fetchAllProtocolBundles.uc';
import { CreateProtocolBundleUsecase } from '../usecases/createProtocolBundle.uc';
import { FetchProtocolBundleByIdUsecase } from '../usecases/fetchProtocolBundleById.uc';
import { UpdateProtocolBundleUsecase } from '../usecases/updateProtocolBundle.uc';
import { DeleteProtocolBundleUsecase } from '../usecases/deleteProtocolBundle.uc';
import { FetchProtocolBundleByCodeUsecase } from '../usecases/fetchProtocolBundleByCode.uc';
import { AddProtocolBundleItemUsecase } from '../usecases/addProtocolBundleItem.uc';
import { RemoveProtocolBundleItemUsecase } from '../usecases/removeProtocolBundleItem.uc';
import { CreateProtocolBundleDto } from '../dto/createProtocolBundle.dto';
import { UpdateProtocolBundleDto } from '../dto/updateProtocolBundle.dto';
import { AddProtocolBundleItemDto } from '../dto/addProtocolBundleItem.dto';

@Controller('protocols')
export class ProtocolsController {
  constructor(
    private readonly serviceBroker: Broker,
    private readonly fetchAllProtocolBundlesUsecase: FetchAllProtocolBundlesUsecase,
    private readonly createProtocolBundleUsecase: CreateProtocolBundleUsecase,
    private readonly fetchProtocolBundleByIdUsecase: FetchProtocolBundleByIdUsecase,
    private readonly updateProtocolBundleUsecase: UpdateProtocolBundleUsecase,
    private readonly deleteProtocolBundleUsecase: DeleteProtocolBundleUsecase,
    private readonly fetchProtocolBundleByCodeUsecase: FetchProtocolBundleByCodeUsecase,
    private readonly addProtocolBundleItemUsecase: AddProtocolBundleItemUsecase,
    private readonly removeProtocolBundleItemUsecase: RemoveProtocolBundleItemUsecase,
  ) {}

  @Get('by-code/:codeValue')
  @RequirePermissions([PERMISSION.PROTOCOL_BUNDLE.READ])
  async getProtocolBundleByCode(@Param('codeValue') codeValue: string) {
    return this.serviceBroker.runUsecases([this.fetchProtocolBundleByCodeUsecase], { codeValue });
  }

  @Get('')
  @RequirePermissions([PERMISSION.PROTOCOL_BUNDLE.LIST])
  async getAllProtocolBundles(@Query() query: GetAllQueryDto) {
    return this.serviceBroker.runUsecases([this.fetchAllProtocolBundlesUsecase], { query });
  }

  @Post('')
  @RequirePermissions([PERMISSION.PROTOCOL_BUNDLE.CREATE])
  async createProtocolBundle(@Body() dto: CreateProtocolBundleDto) {
    return this.serviceBroker.runUsecases([this.createProtocolBundleUsecase], dto);
  }

  @Get(':id')
  @RequirePermissions([PERMISSION.PROTOCOL_BUNDLE.READ])
  async getProtocolBundleById(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.fetchProtocolBundleByIdUsecase], { id });
  }

  @Put(':id')
  @RequirePermissions([PERMISSION.PROTOCOL_BUNDLE.UPDATE])
  async updateProtocolBundle(@Param('id') id: string, @Body() dto: UpdateProtocolBundleDto) {
    return this.serviceBroker.runUsecases([this.updateProtocolBundleUsecase], { id, dto });
  }

  @Delete(':id')
  @RequirePermissions([PERMISSION.PROTOCOL_BUNDLE.DELETE])
  async deleteProtocolBundle(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.deleteProtocolBundleUsecase], { id });
  }

  @Post(':id/items')
  @RequirePermissions([PERMISSION.PROTOCOL_BUNDLE.UPDATE])
  async addProtocolBundleItem(@Param('id') id: string, @Body() dto: AddProtocolBundleItemDto) {
    return this.serviceBroker.runUsecases([this.addProtocolBundleItemUsecase], {
      bundleId: id,
      dto,
    });
  }

  @Delete(':id/items/:itemId')
  @RequirePermissions([PERMISSION.PROTOCOL_BUNDLE.DELETE])
  async removeProtocolBundleItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.serviceBroker.runUsecases([this.removeProtocolBundleItemUsecase], {
      bundleId: id,
      itemId,
    });
  }
}
