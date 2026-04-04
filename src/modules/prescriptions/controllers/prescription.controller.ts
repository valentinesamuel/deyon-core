import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Broker } from '@broker/broker';
import { PERMISSION } from '@shared/constants/permissions';
import { RequirePermissions } from '@shared/decorators/requirePermission.decorator';
import { GetAllQueryDto } from '@shared/queryEngine';
import { CreatePrescriptionDto } from '../dto/createPrescription.dto';
import { DispensePrescriptionDto } from '../dto/dispensePrescription.dto';
import { PartialDispenseDto } from '../dto/partialDispense.dto';
import { MarkUnfulfillableDto } from '../dto/markUnfulfillable.dto';
import { CreatePrescriptionUsecase } from '../usecases/createPrescription.uc';
import { FetchAllPrescriptionsUsecase } from '../usecases/fetchAllPrescriptions.uc';
import { FetchPrescriptionByIdUsecase } from '../usecases/fetchPrescriptionById.uc';
import { DispensePrescriptionUsecase } from '../usecases/dispensePrescription.uc';
import { PartialDispenseUsecase } from '../usecases/partialDispense.uc';
import { MarkUnfulfillableUsecase } from '../usecases/markUnfulfillable.uc';

@ApiTags('Prescriptions')
@Controller('prescriptions')
export class PrescriptionController {
  constructor(
    private readonly serviceBroker: Broker,
    private readonly createPrescriptionUsecase: CreatePrescriptionUsecase,
    private readonly fetchAllPrescriptionsUsecase: FetchAllPrescriptionsUsecase,
    private readonly fetchPrescriptionByIdUsecase: FetchPrescriptionByIdUsecase,
    private readonly dispensePrescriptionUsecase: DispensePrescriptionUsecase,
    private readonly partialDispenseUsecase: PartialDispenseUsecase,
    private readonly markUnfulfillableUsecase: MarkUnfulfillableUsecase,
  ) {}

  @Post()
  @RequirePermissions([PERMISSION.PRESCRIPTION.CREATE])
  createPrescription(@Body() dto: CreatePrescriptionDto) {
    return this.serviceBroker.runUsecases([this.createPrescriptionUsecase], dto);
  }

  @Get()
  @RequirePermissions([PERMISSION.PRESCRIPTION.LIST])
  getAllPrescriptions(@Query() query: GetAllQueryDto) {
    return this.serviceBroker.runUsecases([this.fetchAllPrescriptionsUsecase], { query });
  }

  @Get(':id')
  @RequirePermissions([PERMISSION.PRESCRIPTION.READ])
  getPrescriptionById(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.fetchPrescriptionByIdUsecase], { id });
  }

  @Post(':id/dispense')
  @RequirePermissions([PERMISSION.PRESCRIPTION.DISPENSE])
  dispensePrescription(@Param('id') id: string, @Body() dto: DispensePrescriptionDto) {
    return this.serviceBroker.runUsecases([this.dispensePrescriptionUsecase], { id, ...dto });
  }

  @Post(':id/partial-dispense')
  @RequirePermissions([PERMISSION.PRESCRIPTION.DISPENSE])
  partialDispense(@Param('id') id: string, @Body() dto: PartialDispenseDto) {
    return this.serviceBroker.runUsecases([this.partialDispenseUsecase], { id, ...dto });
  }

  @Patch(':id/mark-unfulfillable')
  @RequirePermissions([PERMISSION.PRESCRIPTION.MARK_UNFULFILLABLE])
  markUnfulfillable(@Param('id') id: string, @Body() dto: MarkUnfulfillableDto) {
    return this.serviceBroker.runUsecases([this.markUnfulfillableUsecase], { id, ...dto });
  }
}
