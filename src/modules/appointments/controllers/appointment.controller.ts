import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Broker } from '@broker/broker';
import { PERMISSION } from '@shared/constants/permissions';
import { RequirePermissions } from '@shared/decorators/requirePermission.decorator';
import { GetAllQueryDto } from '@shared/queryEngine';
import { BookAppointmentDto } from '../dto/bookAppointment.dto';
import { UpdateAppointmentDto } from '../dto/updateAppointment.dto';
import { BookAppointmentUsecase } from '../usecases/bookAppointment.uc';
import { FetchAllAppointmentsUsecase } from '../usecases/fetchAllAppointments.uc';
import { FetchAppointmentByIdUsecase } from '../usecases/fetchAppointmentById.uc';
import { UpdateAppointmentUsecase } from '../usecases/updateAppointment.uc';
import { ConfirmAppointmentUsecase } from '../usecases/confirmAppointment.uc';
import { CheckInAppointmentUsecase } from '../usecases/checkInAppointment.uc';
import { CancelAppointmentUsecase } from '../usecases/cancelAppointment.uc';
import { MarkNoShowUsecase } from '../usecases/markNoShow.uc';

@ApiTags('Appointments')
@Controller('appointments')
export class AppointmentController {
  constructor(
    private readonly serviceBroker: Broker,
    private readonly bookAppointmentUsecase: BookAppointmentUsecase,
    private readonly fetchAllAppointmentsUsecase: FetchAllAppointmentsUsecase,
    private readonly fetchAppointmentByIdUsecase: FetchAppointmentByIdUsecase,
    private readonly updateAppointmentUsecase: UpdateAppointmentUsecase,
    private readonly confirmAppointmentUsecase: ConfirmAppointmentUsecase,
    private readonly checkInAppointmentUsecase: CheckInAppointmentUsecase,
    private readonly cancelAppointmentUsecase: CancelAppointmentUsecase,
    private readonly markNoShowUsecase: MarkNoShowUsecase,
  ) {}

  @Post()
  @RequirePermissions([PERMISSION.APPOINTMENT.CREATE])
  bookAppointment(@Body() dto: BookAppointmentDto) {
    return this.serviceBroker.runUsecases([this.bookAppointmentUsecase], dto);
  }

  @Get()
  @RequirePermissions([PERMISSION.APPOINTMENT.LIST])
  getAllAppointments(@Query() query: GetAllQueryDto) {
    return this.serviceBroker.runUsecases([this.fetchAllAppointmentsUsecase], { query });
  }

  @Get(':id')
  @RequirePermissions([PERMISSION.APPOINTMENT.READ])
  getAppointmentById(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.fetchAppointmentByIdUsecase], { id });
  }

  @Patch(':id')
  @RequirePermissions([PERMISSION.APPOINTMENT.UPDATE])
  updateAppointment(@Param('id') id: string, @Body() dto: UpdateAppointmentDto) {
    return this.serviceBroker.runUsecases([this.updateAppointmentUsecase], { id, dto });
  }

  @Patch(':id/confirm')
  @RequirePermissions([PERMISSION.APPOINTMENT.CONFIRM])
  confirmAppointment(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.confirmAppointmentUsecase], { id });
  }

  @Patch(':id/check-in')
  @RequirePermissions([PERMISSION.APPOINTMENT.CHECK_IN])
  checkInAppointment(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.checkInAppointmentUsecase], { id });
  }

  @Patch(':id/cancel')
  @RequirePermissions([PERMISSION.APPOINTMENT.CANCEL])
  cancelAppointment(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.cancelAppointmentUsecase], { id });
  }

  @Patch(':id/no-show')
  @RequirePermissions([PERMISSION.APPOINTMENT.NO_SHOW])
  markNoShow(@Param('id') id: string) {
    return this.serviceBroker.runUsecases([this.markNoShowUsecase], { id });
  }
}
