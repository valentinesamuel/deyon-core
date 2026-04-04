import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Broker } from '@broker/broker';
import { PERMISSION } from '@shared/constants/permissions';
import { RequirePermissions } from '@shared/decorators/requirePermission.decorator';
import { GetAllQueryDto } from '@shared/queryEngine';
import { CreatePatientDto } from '../dto/createPatient.dto';
import { UpdatePatientDto } from '../dto/updatePatient.dto';
import { EnrollPatientHmoDto } from '../dto/enrollPatientHmo.dto';
import { AddPatientHistoryDto } from '../dto/addPatientHistory.dto';
import { CreatePatientUsecase } from '../usecases/createPatient.uc';
import { FetchAllPatientsUsecase } from '../usecases/fetchAllPatients.uc';
import { FetchPatientByIdUsecase } from '../usecases/fetchPatientById.uc';
import { UpdatePatientUsecase } from '../usecases/updatePatient.uc';
import { DeletePatientUsecase } from '../usecases/deletePatient.uc';
import { SearchPatientsUsecase } from '../usecases/searchPatients.uc';
import { EnrollPatientHmoUsecase } from '../usecases/enrollPatientHmo.uc';
import { FetchPatientHistoryUsecase } from '../usecases/fetchPatientHistory.uc';
import { AddPatientHistoryItemUsecase } from '../usecases/addPatientHistoryItem.uc';
import { RemovePatientHistoryItemUsecase } from '../usecases/removePatientHistoryItem.uc';

@ApiTags('Patients')
@Controller('patients')
export class PatientController {
  constructor(
    private readonly serviceBroker: Broker,
    private readonly createPatientUsecase: CreatePatientUsecase,
    private readonly fetchAllPatientsUsecase: FetchAllPatientsUsecase,
    private readonly fetchPatientByIdUsecase: FetchPatientByIdUsecase,
    private readonly updatePatientUsecase: UpdatePatientUsecase,
    private readonly deletePatientUsecase: DeletePatientUsecase,
    private readonly searchPatientsUsecase: SearchPatientsUsecase,
    private readonly enrollPatientHmoUsecase: EnrollPatientHmoUsecase,
    private readonly fetchPatientHistoryUsecase: FetchPatientHistoryUsecase,
    private readonly addPatientHistoryItemUsecase: AddPatientHistoryItemUsecase,
    private readonly removePatientHistoryItemUsecase: RemovePatientHistoryItemUsecase,
  ) {}

  @Post()
  @RequirePermissions([PERMISSION.PATIENT.CREATE])
  createPatient(@Body() dto: CreatePatientDto) {
    return this.serviceBroker.runUsecases([this.createPatientUsecase], dto);
  }

  @Get()
  @RequirePermissions([PERMISSION.PATIENT.LIST])
  getAllPatients(@Query() query: GetAllQueryDto) {
    return this.serviceBroker.runUsecases([this.fetchAllPatientsUsecase], { query });
  }

  @Get('search')
  @RequirePermissions([PERMISSION.PATIENT.LIST])
  searchPatients(@Query('q') q: string) {
    return this.serviceBroker.runUsecases([this.searchPatientsUsecase], { q });
  }

  @Get(':id')
  @RequirePermissions([PERMISSION.PATIENT.READ])
  getPatientById(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.fetchPatientByIdUsecase], { id });
  }

  @Patch(':id')
  @RequirePermissions([PERMISSION.PATIENT.UPDATE])
  updatePatient(@Param('id') id: string, @Body() dto: UpdatePatientDto) {
    return this.serviceBroker.runUsecases([this.updatePatientUsecase], { id, dto });
  }

  @Delete(':id')
  @RequirePermissions([PERMISSION.PATIENT.DELETE])
  deletePatient(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.deletePatientUsecase], { id });
  }

  @Patch(':id/hmo')
  @RequirePermissions([PERMISSION.PATIENT.ENROLL_HMO])
  enrollPatientHmo(@Param('id') id: string, @Body() dto: EnrollPatientHmoDto) {
    return this.serviceBroker.runUsecases([this.enrollPatientHmoUsecase], { id, dto });
  }

  @Get(':id/history')
  @RequirePermissions([PERMISSION.PATIENT.READ])
  getPatientHistory(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.fetchPatientHistoryUsecase], { id });
  }

  @Post(':id/history')
  @RequirePermissions([PERMISSION.PATIENT.MANAGE_HISTORY])
  addPatientHistoryItem(@Param('id') id: string, @Body() dto: AddPatientHistoryDto) {
    return this.serviceBroker.runUsecases([this.addPatientHistoryItemUsecase], { id, dto });
  }

  @Delete(':id/history/:historyId')
  @RequirePermissions([PERMISSION.PATIENT.MANAGE_HISTORY])
  removePatientHistoryItem(@Param('id') id: string, @Param('historyId') historyId: string) {
    return this.serviceBroker.runUsecases([this.removePatientHistoryItemUsecase], {
      id,
      historyId,
    });
  }
}
