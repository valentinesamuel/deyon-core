import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CursorPage, QueryEngineService, QueryInput } from '@shared/queryEngine';
import { Appointment } from '@modules/core/entities/appointment.entity';
import { APPOINTMENT_QUERY_CONFIG } from '../appointments.constants';

type TFetchAllAppointmentsParams = { query: QueryInput };

@Injectable()
export class FetchAllAppointmentsUsecase extends Usecase<
  CursorPage<Appointment>,
  TFetchAllAppointmentsParams
> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly queryEngine: QueryEngineService) {
    super();
  }

  async execute(
    _em: EntityManager,
    params: TFetchAllAppointmentsParams,
  ): Promise<CursorPage<Appointment>> {
    return this.queryEngine.execute(Appointment, params.query, APPOINTMENT_QUERY_CONFIG);
  }
}
