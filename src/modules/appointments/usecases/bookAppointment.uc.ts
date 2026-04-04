import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { BookAppointmentDto } from '../dto/bookAppointment.dto';
import { AppointmentService } from '../service/appointment.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { Appointment, AppointmentStatusEnum } from '@modules/core/entities/appointment.entity';

type TBookAppointmentResult = { appointment: Appointment };

@Injectable()
export class BookAppointmentUsecase extends Usecase<TBookAppointmentResult, BookAppointmentDto> {
  constructor(
    private readonly appointmentService: AppointmentService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: BookAppointmentDto): Promise<TBookAppointmentResult> {
    const actorId = this.requestContextService.getUserId();

    const appointment = await this.appointmentService.createAppointment(
      {
        ...params,
        scheduleDate: new Date(params.scheduleDate),
        status: AppointmentStatusEnum.SCHEDULED,
        bookedBy: params.bookedBy ?? actorId,
      } as Partial<Appointment>,
      em,
    );

    await this.eventService.log(
      {
        actorId,
        event: EventType.APPOINTMENT_BOOKED,
        module: EventModule.APPOINTMENT,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: {
          appointmentId: appointment.id,
          patientId: params.patientId,
          doctorId: params.doctorId,
        },
      },
      em,
    );

    return { appointment };
  }
}
