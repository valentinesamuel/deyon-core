import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Broker } from '@broker/broker';
import { PERMISSION } from '@shared/constants/permissions';
import { RequirePermissions } from '@shared/decorators/requirePermission.decorator';
import { GetAllQueryDto } from '@shared/queryEngine';
import { CreateConsultationDto } from '../dto/createConsultation.dto';
import { UpdateConsultationDto } from '../dto/updateConsultation.dto';
import { AmendConsultationDto } from '../dto/amendConsultation.dto';
import { CreateConsultationUsecase } from '../usecases/createConsultation.uc';
import { FetchAllConsultationsUsecase } from '../usecases/fetchAllConsultations.uc';
import { FetchConsultationByIdUsecase } from '../usecases/fetchConsultationById.uc';
import { UpdateConsultationUsecase } from '../usecases/updateConsultation.uc';
import { StartConsultationUsecase } from '../usecases/startConsultation.uc';
import { FinalizeConsultationUsecase } from '../usecases/finalizeConsultation.uc';
import { AmendConsultationUsecase } from '../usecases/amendConsultation.uc';
import { DeleteConsultationUsecase } from '../usecases/deleteConsultation.uc';

@ApiTags('Consultations')
@Controller('consultations')
export class ConsultationController {
  constructor(
    private readonly serviceBroker: Broker,
    private readonly createConsultationUsecase: CreateConsultationUsecase,
    private readonly fetchAllConsultationsUsecase: FetchAllConsultationsUsecase,
    private readonly fetchConsultationByIdUsecase: FetchConsultationByIdUsecase,
    private readonly updateConsultationUsecase: UpdateConsultationUsecase,
    private readonly startConsultationUsecase: StartConsultationUsecase,
    private readonly finalizeConsultationUsecase: FinalizeConsultationUsecase,
    private readonly amendConsultationUsecase: AmendConsultationUsecase,
    private readonly deleteConsultationUsecase: DeleteConsultationUsecase,
  ) {}

  @Post()
  @RequirePermissions([PERMISSION.CONSULTATION.CREATE])
  createConsultation(@Body() dto: CreateConsultationDto) {
    return this.serviceBroker.runUsecases([this.createConsultationUsecase], dto);
  }

  @Get()
  @RequirePermissions([PERMISSION.CONSULTATION.LIST])
  getAllConsultations(@Query() query: GetAllQueryDto) {
    return this.serviceBroker.runUsecases([this.fetchAllConsultationsUsecase], { query });
  }

  @Get(':id')
  @RequirePermissions([PERMISSION.CONSULTATION.READ])
  getConsultationById(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.fetchConsultationByIdUsecase], { id });
  }

  @Patch(':id')
  @RequirePermissions([PERMISSION.CONSULTATION.UPDATE])
  updateConsultation(@Param('id') id: string, @Body() dto: UpdateConsultationDto) {
    return this.serviceBroker.runUsecases([this.updateConsultationUsecase], { id, ...dto });
  }

  @Patch(':id/start')
  @RequirePermissions([PERMISSION.CONSULTATION.START])
  startConsultation(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.startConsultationUsecase], { id });
  }

  @Patch(':id/finalize')
  @RequirePermissions([PERMISSION.CONSULTATION.FINALIZE])
  finalizeConsultation(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.finalizeConsultationUsecase], { id });
  }

  @Patch(':id/amend')
  @RequirePermissions([PERMISSION.CONSULTATION.AMEND])
  amendConsultation(@Param('id') id: string, @Body() dto: AmendConsultationDto) {
    return this.serviceBroker.runUsecases([this.amendConsultationUsecase], { id, ...dto });
  }

  @Delete(':id')
  @RequirePermissions([PERMISSION.CONSULTATION.DELETE])
  deleteConsultation(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.deleteConsultationUsecase], { id });
  }
}
