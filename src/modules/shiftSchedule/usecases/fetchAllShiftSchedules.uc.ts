import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CursorPage, QueryEngineService, QueryInput } from '@shared/queryEngine';
import { ShiftSchedule } from '@modules/core/entities/shiftSchedule.entity';
import { SHIFT_SCHEDULE_QUERY_CONFIG } from '../shiftSchedule.constants';

type FetchAllShiftSchedulesParams = { query: QueryInput };

@Injectable()
export class FetchAllShiftSchedulesUsecase extends Usecase<
  CursorPage<ShiftSchedule>,
  FetchAllShiftSchedulesParams
> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly queryEngine: QueryEngineService) {
    super();
  }

  async execute(
    em: EntityManager,
    params: FetchAllShiftSchedulesParams,
  ): Promise<CursorPage<ShiftSchedule>> {
    return this.queryEngine.execute(ShiftSchedule, params.query, SHIFT_SCHEDULE_QUERY_CONFIG);
  }
}
