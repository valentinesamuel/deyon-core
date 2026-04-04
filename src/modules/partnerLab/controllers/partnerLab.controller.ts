import { Broker } from '@broker/broker';
import { Body, Controller, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { PERMISSION } from '@shared/constants/permissions';
import { RequirePermissions } from '@shared/decorators/requirePermission.decorator';
import { GetAllQueryDto } from '@shared/queryEngine';
import { FetchAllPartnerLabsUsecase } from '../usecases/fetchAllPartnerLabs.uc';
import { CreatePartnerLabUsecase } from '../usecases/createPartnerLab.uc';
import { FetchPartnerLabByIdUsecase } from '../usecases/fetchPartnerLabById.uc';
import { UpdatePartnerLabUsecase } from '../usecases/updatePartnerLab.uc';
import { TogglePartnerLabStatusUsecase } from '../usecases/togglePartnerLabStatus.uc';
import { CreatePartnerLabDto } from '../dto/createPartnerLab.dto';
import { UpdatePartnerLabDto } from '../dto/updatePartnerLab.dto';
import { UpdatePartnerLabStatusDto } from '../dto/updatePartnerLabStatus.dto';

@Controller('labs/partners')
export class PartnerLabController {
  constructor(
    private readonly serviceBroker: Broker,
    private readonly fetchAllPartnerLabsUsecase: FetchAllPartnerLabsUsecase,
    private readonly createPartnerLabUsecase: CreatePartnerLabUsecase,
    private readonly fetchPartnerLabByIdUsecase: FetchPartnerLabByIdUsecase,
    private readonly updatePartnerLabUsecase: UpdatePartnerLabUsecase,
    private readonly togglePartnerLabStatusUsecase: TogglePartnerLabStatusUsecase,
  ) {}

  @Get('')
  @RequirePermissions([PERMISSION.PARTNER_LAB.LIST])
  async getAllPartnerLabs(@Query() query: GetAllQueryDto) {
    return this.serviceBroker.runUsecases([this.fetchAllPartnerLabsUsecase], { query });
  }

  @Get(':id')
  @RequirePermissions([PERMISSION.PARTNER_LAB.READ])
  async getPartnerLabById(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.fetchPartnerLabByIdUsecase], { id });
  }

  @Post('')
  @RequirePermissions([PERMISSION.PARTNER_LAB.CREATE])
  async createPartnerLab(@Body() dto: CreatePartnerLabDto) {
    return this.serviceBroker.runUsecases([this.createPartnerLabUsecase], dto);
  }

  @Put(':id')
  @RequirePermissions([PERMISSION.PARTNER_LAB.UPDATE])
  async updatePartnerLab(@Param('id') id: string, @Body() dto: UpdatePartnerLabDto) {
    return this.serviceBroker.runUsecases([this.updatePartnerLabUsecase], { id, dto });
  }

  @Patch(':id/status')
  @RequirePermissions([PERMISSION.PARTNER_LAB.UPDATE])
  async togglePartnerLabStatus(@Param('id') id: string, @Body() dto: UpdatePartnerLabStatusDto) {
    return this.serviceBroker.runUsecases([this.togglePartnerLabStatusUsecase], { id, dto });
  }
}
