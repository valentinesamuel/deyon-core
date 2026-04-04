import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Broker } from '@broker/broker';
import { PERMISSION } from '@shared/constants/permissions';
import { RequirePermissions } from '@shared/decorators/requirePermission.decorator';
import { GetAllQueryDto } from '@shared/queryEngine';
import { RecordVitalsDto } from '../dto/recordVitals.dto';
import { RecordVitalsUsecase } from '../usecases/recordVitals.uc';
import { FetchAllVitalsUsecase } from '../usecases/fetchAllVitals.uc';
import { FetchVitalByIdUsecase } from '../usecases/fetchVitalById.uc';

@ApiTags('Vital Signs')
@Controller('vitals')
export class VitalController {
  constructor(
    private readonly serviceBroker: Broker,
    private readonly recordVitalsUsecase: RecordVitalsUsecase,
    private readonly fetchAllVitalsUsecase: FetchAllVitalsUsecase,
    private readonly fetchVitalByIdUsecase: FetchVitalByIdUsecase,
  ) {}

  @Post()
  @RequirePermissions([PERMISSION.VITAL_SIGNS.CREATE])
  recordVitals(@Body() dto: RecordVitalsDto) {
    return this.serviceBroker.runUsecases([this.recordVitalsUsecase], dto);
  }

  @Get()
  @RequirePermissions([PERMISSION.VITAL_SIGNS.LIST])
  getAllVitals(@Query() query: GetAllQueryDto) {
    return this.serviceBroker.runUsecases([this.fetchAllVitalsUsecase], { query });
  }

  @Get(':id')
  @RequirePermissions([PERMISSION.VITAL_SIGNS.READ])
  getVitalById(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.fetchVitalByIdUsecase], { id });
  }
}
