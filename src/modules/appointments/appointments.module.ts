import { Module } from '@nestjs/common';
import { AppointmentController } from './controllers/appointment.controller';
import { AppointmentService } from './service/appointment.service';
import { AppointmentRepository } from '@adapters/repositories/appointment.repository';
import { BookAppointmentUsecase } from './usecases/bookAppointment.uc';
import { FetchAllAppointmentsUsecase } from './usecases/fetchAllAppointments.uc';
import { FetchAppointmentByIdUsecase } from './usecases/fetchAppointmentById.uc';
import { UpdateAppointmentUsecase } from './usecases/updateAppointment.uc';
import { ConfirmAppointmentUsecase } from './usecases/confirmAppointment.uc';
import { CheckInAppointmentUsecase } from './usecases/checkInAppointment.uc';
import { CancelAppointmentUsecase } from './usecases/cancelAppointment.uc';
import { MarkNoShowUsecase } from './usecases/markNoShow.uc';

@Module({
  controllers: [AppointmentController],
  providers: [
    AppointmentService,
    AppointmentRepository,
    BookAppointmentUsecase,
    FetchAllAppointmentsUsecase,
    FetchAppointmentByIdUsecase,
    UpdateAppointmentUsecase,
    ConfirmAppointmentUsecase,
    CheckInAppointmentUsecase,
    CancelAppointmentUsecase,
    MarkNoShowUsecase,
  ],
  exports: [AppointmentService],
})
export class AppointmentsModule {}
