import { Broker } from '@broker/broker';
import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { PERMISSION } from '@shared/constants/permissions';
import { RequirePermissions } from '@shared/decorators/requirePermission.decorator';
import { GetAllQueryDto } from '@shared/queryEngine';
import { FetchAllHmoContractsUsecase } from '../usecases/hmoContracts/fetchAllHmoContracts.uc';
import { CreateHmoContractUsecase } from '../usecases/hmoContracts/createHmoContract.uc';
import { FetchHmoContractByIdUsecase } from '../usecases/hmoContracts/fetchHmoContractById.uc';
import { UpdateHmoContractUsecase } from '../usecases/hmoContracts/updateHmoContract.uc';
import { ToggleHmoContractStatusUsecase } from '../usecases/hmoContracts/toggleHmoContractStatus.uc';
import { DeleteHmoContractUsecase } from '../usecases/hmoContracts/deleteHmoContract.uc';
import { CreateHmoContractDto } from '../dto/hmoContract/createHmoContract.dto';
import { UpdateHmoContractDto } from '../dto/hmoContract/updateHmoContract.dto';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

class ToggleHmoContractStatusDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isActive: boolean;
}

@Controller('hmo/providers/:providerId/contracts')
export class HmoContractsController {
  constructor(
    private readonly serviceBroker: Broker,
    private readonly fetchAllHmoContractsUsecase: FetchAllHmoContractsUsecase,
    private readonly createHmoContractUsecase: CreateHmoContractUsecase,
    private readonly fetchHmoContractByIdUsecase: FetchHmoContractByIdUsecase,
    private readonly updateHmoContractUsecase: UpdateHmoContractUsecase,
    private readonly toggleHmoContractStatusUsecase: ToggleHmoContractStatusUsecase,
    private readonly deleteHmoContractUsecase: DeleteHmoContractUsecase,
  ) {}

  @Get('')
  @RequirePermissions([PERMISSION.HMO_CONTRACT.LIST])
  async getAllHmoContracts(
    @Param('providerId') providerId: string,
    @Query() query: GetAllQueryDto,
  ) {
    return this.serviceBroker.runUsecases([this.fetchAllHmoContractsUsecase], {
      query,
      providerId,
    });
  }

  @Post('')
  @RequirePermissions([PERMISSION.HMO_CONTRACT.CREATE])
  async createHmoContract(
    @Param('providerId') providerId: string,
    @Body() dto: CreateHmoContractDto,
  ) {
    return this.serviceBroker.runUsecases([this.createHmoContractUsecase], { providerId, dto });
  }

  @Get(':id')
  @RequirePermissions([PERMISSION.HMO_CONTRACT.READ])
  async getHmoContractById(@Param('providerId') providerId: string, @Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.fetchHmoContractByIdUsecase], { id, providerId });
  }

  @Put(':id')
  @RequirePermissions([PERMISSION.HMO_CONTRACT.UPDATE])
  async updateHmoContract(
    @Param('providerId') providerId: string,
    @Param('id') id: string,
    @Body() dto: UpdateHmoContractDto,
  ) {
    return this.serviceBroker.runUsecases([this.updateHmoContractUsecase], { id, providerId, dto });
  }

  @Patch(':id/status')
  @RequirePermissions([PERMISSION.HMO_CONTRACT.UPDATE])
  async toggleHmoContractStatus(@Param('id') id: string, @Body() dto: ToggleHmoContractStatusDto) {
    return this.serviceBroker.runUsecases([this.toggleHmoContractStatusUsecase], {
      id,
      isActive: dto.isActive,
    });
  }

  @Delete(':id')
  @RequirePermissions([PERMISSION.HMO_CONTRACT.DELETE])
  async deleteHmoContract(@Param('providerId') providerId: string, @Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.deleteHmoContractUsecase], { id, providerId });
  }
}
