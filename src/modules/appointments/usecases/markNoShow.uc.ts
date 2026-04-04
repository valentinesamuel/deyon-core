import { Injectable, BadRequestException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { AppointmentService } from '../service/appointment.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { Appointment, AppointmentStatusEnum } from '@modules/core/entities/appointment.entity';

type TParams = { id: string };
type TResult = { appointment: Appointment };

@Injectable()
export class MarkNoShowUsecase extends Usecase<TResult, TParams> {
  constructor(
    private readonly appointmentService: AppointmentService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: TParams): Promise<TResult> {
    const { id } = params;

    const existing = await this.appointmentService.getAppointmentOrFail({ where: { id } }, em);

    if (
      existing.status !== AppointmentStatusEnum.SCHEDULED &&
      existing.status !== AppointmentStatusEnum.CONFIRMED
    ) {
      throw new BadRequestException(
        'Only scheduled or confirmed appointments can be marked no-show',
      );
    }

    const appointment = await this.appointmentService.updateStatus(
      id,
      AppointmentStatusEnum.NO_SHOW,
      {},
      em,
    );

    const actorId = this.requestContextService.getUserId();
    await this.eventService.log(
      {
        actorId,
        event: EventType.APPOINTMENT_NO_SHOW,
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
