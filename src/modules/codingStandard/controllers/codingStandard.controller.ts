import { Broker } from '@broker/broker';
import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { PERMISSION } from '@shared/constants/permissions';
import { RequirePermissions } from '@shared/decorators/requirePermission.decorator';
import { GetAllQueryDto } from '@shared/queryEngine';
import { FetchAllCodingStandardsUsecase } from '../usecases/fetchAllCodingStandards.uc';
import { CreateCodingStandardUsecase } from '../usecases/createCodingStandard.uc';
import { FetchCodingStandardByIdUsecase } from '../usecases/fetchCodingStandardById.uc';
import { UpdateCodingStandardUsecase } from '../usecases/updateCodingStandard.uc';
import { FetchMedicalCodesByStandardUsecase } from '../usecases/fetchMedicalCodesByStandard.uc';
import { CreateMedicalCodeUsecase } from '../usecases/createMedicalCode.uc';
import { FetchMedicalCodeByIdUsecase } from '../usecases/fetchMedicalCodeById.uc';
import { UpdateMedicalCodeUsecase } from '../usecases/updateMedicalCode.uc';
import { DeleteMedicalCodeUsecase } from '../usecases/deleteMedicalCode.uc';
import { CreateCodingStandardDto } from '../dto/createCodingStandard.dto';
import { UpdateCodingStandardDto } from '../dto/updateCodingStandard.dto';
import { CreateMedicalCodeDto } from '../dto/createMedicalCode.dto';
import { UpdateMedicalCodeDto } from '../dto/updateMedicalCode.dto';

@Controller('coding')
export class CodingStandardController {
  constructor(
    private readonly serviceBroker: Broker,
    private readonly fetchAllCodingStandardsUsecase: FetchAllCodingStandardsUsecase,
    private readonly createCodingStandardUsecase: CreateCodingStandardUsecase,
    private readonly fetchCodingStandardByIdUsecase: FetchCodingStandardByIdUsecase,
    private readonly updateCodingStandardUsecase: UpdateCodingStandardUsecase,
    private readonly fetchMedicalCodesByStandardUsecase: FetchMedicalCodesByStandardUsecase,
    private readonly createMedicalCodeUsecase: CreateMedicalCodeUsecase,
    private readonly fetchMedicalCodeByIdUsecase: FetchMedicalCodeByIdUsecase,
    private readonly updateMedicalCodeUsecase: UpdateMedicalCodeUsecase,
    private readonly deleteMedicalCodeUsecase: DeleteMedicalCodeUsecase,
  ) {}

  @Get('standards')
  @RequirePermissions([PERMISSION.CODING_STANDARD.LIST])
  async getAllCodingStandards(@Query() query: GetAllQueryDto) {
    return this.serviceBroker.runUsecases([this.fetchAllCodingStandardsUsecase], { query });
  }

  @Post('standards')
  @RequirePermissions([PERMISSION.CODING_STANDARD.CREATE])
  async createCodingStandard(@Body() dto: CreateCodingStandardDto) {
    return this.serviceBroker.runUsecases([this.createCodingStandardUsecase], dto);
  }

  @Get('standards/:id')
  @RequirePermissions([PERMISSION.CODING_STANDARD.READ])
  async getCodingStandardById(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.fetchCodingStandardByIdUsecase], { id });
  }

  @Put('standards/:id')
  @RequirePermissions([PERMISSION.CODING_STANDARD.UPDATE])
  async updateCodingStandard(@Param('id') id: string, @Body() dto: UpdateCodingStandardDto) {
    return this.serviceBroker.runUsecases([this.updateCodingStandardUsecase], { id, dto });
  }

  @Get('standards/:id/codes')
  @RequirePermissions([PERMISSION.MEDICAL_CODE.LIST])
  async getMedicalCodesByStandard(@Param('id') id: string, @Query() query: GetAllQueryDto) {
    return this.serviceBroker.runUsecases([this.fetchMedicalCodesByStandardUsecase], {
      standardId: id,
      query,
    });
  }

  @Post('standards/:standardId/codes')
  @RequirePermissions([PERMISSION.MEDICAL_CODE.CREATE])
  async createMedicalCode(
    @Param('standardId') standardId: string,
    @Body() dto: CreateMedicalCodeDto,
  ) {
    return this.serviceBroker.runUsecases([this.createMedicalCodeUsecase], { standardId, dto });
  }

  @Get('codes/:id')
  @RequirePermissions([PERMISSION.MEDICAL_CODE.READ])
  async getMedicalCodeById(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.fetchMedicalCodeByIdUsecase], { id });
  }

  @Put('codes/:id')
  @RequirePermissions([PERMISSION.MEDICAL_CODE.UPDATE])
  async updateMedicalCode(@Param('id') id: string, @Body() dto: UpdateMedicalCodeDto) {
    return this.serviceBroker.runUsecases([this.updateMedicalCodeUsecase], { id, dto });
  }

  @Delete('codes/:id')
  @RequirePermissions([PERMISSION.MEDICAL_CODE.DELETE])
  async deleteMedicalCode(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.deleteMedicalCodeUsecase], { id });
  }
}
