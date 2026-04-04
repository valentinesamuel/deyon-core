import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { AppointmentService } from '../service/appointment.service';
import { Appointment } from '@modules/core/entities/appointment.entity';

type TFetchAppointmentByIdParams = { id: string };
type TFetchAppointmentByIdResult = { appointment: Appointment };

@Injectable()
export class FetchAppointmentByIdUsecase extends Usecase<
  TFetchAppointmentByIdResult,
  TFetchAppointmentByIdParams
> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly appointmentService: AppointmentService) {
    super();
  }

  async execute(
    _em: EntityManager,
    params: TFetchAppointmentByIdParams,
  ): Promise<TFetchAppointmentByIdResult> {
    const appointment = await this.appointmentService.getAppointmentOrFail(
      { where: { id: params.id }, relations: { patient: true, doctor: true } },
      _em,
    );
    return { appointment };
  }
}
