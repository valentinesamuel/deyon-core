import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { UpdateAppointmentDto } from '../dto/updateAppointment.dto';
import { AppointmentService } from '../service/appointment.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { Appointment } from '@modules/core/entities/appointment.entity';

type TUpdateAppointmentParams = { id: string; dto: UpdateAppointmentDto };
type TUpdateAppointmentResult = { appointment: Appointment };

@Injectable()
export class UpdateAppointmentUsecase extends Usecase<
  TUpdateAppointmentResult,
  TUpdateAppointmentParams
> {
  constructor(
    private readonly appointmentService: AppointmentService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(
    em: EntityManager,
    params: TUpdateAppointmentParams,
  ): Promise<TUpdateAppointmentResult> {
    const { id, dto } = params;

    const data: Partial<Appointment> = { ...dto } as any;
    if (dto.scheduleDate) data.scheduleDate = new Date(dto.scheduleDate);

    const appointment = await this.appointmentService.updateAppointment(id, data, em);

    const actorId = this.requestContextService.getUserId();
    await this.eventService.log(
      {
        actorId,
        event: EventType.APPOINTMENT_UPDATED,
        module: EventModule.APPOINTMENT,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { appointmentId: id },
      },
      em,
    );

    return { appointment };
  }
}
