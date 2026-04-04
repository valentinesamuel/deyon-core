import { Injectable } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { AppointmentService } from '../service/appointment.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { Appointment, AppointmentStatusEnum } from '@modules/core/entities/appointment.entity';

type TConfirmAppointmentParams = { id: string };
type TConfirmAppointmentResult = { appointment: Appointment };

@Injectable()
export class ConfirmAppointmentUsecase extends Usecase<
  TConfirmAppointmentResult,
  TConfirmAppointmentParams
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
    params: TConfirmAppointmentParams,
  ): Promise<TConfirmAppointmentResult> {
    const { id } = params;

    const existing = await this.appointmentService.getAppointmentOrFail({ where: { id } }, em);

    if (existing.status !== AppointmentStatusEnum.SCHEDULED) {
      throw new BadRequestException('Only scheduled appointments can be confirmed');
    }

    const appointment = await this.appointmentService.updateStatus(
      id,
      AppointmentStatusEnum.CONFIRMED,
      {},
      em,
    );

    const actorId = this.requestContextService.getUserId();
    await this.eventService.log(
      {
        actorId,
        event: EventType.APPOINTMENT_CONFIRMED,
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
