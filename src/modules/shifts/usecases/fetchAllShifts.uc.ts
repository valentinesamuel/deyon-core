import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CursorPage, QueryEngineService, QueryInput } from '@shared/queryEngine';
import { Shift } from '@modules/core/entities/shift.entity';
import { SHIFT_QUERY_CONFIG } from '../shifts.constants';

type TParams = { query: QueryInput };

@Injectable()
export class FetchAllShiftsUsecase extends Usecase<CursorPage<Shift>, TParams> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly queryEngine: QueryEngineService) {
    super();
  }

  async execute(_em: EntityManager, params: TParams): Promise<CursorPage<Shift>> {
    return this.queryEngine.execute(Shift, params.query, SHIFT_QUERY_CONFIG);
  }
}
