import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { Staff } from '@modules/core/entities/staff.entity';
import { STAFF_QUERY_CONFIG } from '../staff.constants';
import { CursorPage, QueryEngineService, QueryInput } from '@shared/queryEngine';

type FetchAllStaffParams = { query: QueryInput };

@Injectable()
export class FetchAllStaffUsecase extends Usecase<CursorPage<Staff>, FetchAllStaffParams> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly queryEngine: QueryEngineService) {
    super();
  }

  async execute(em: EntityManager, params: FetchAllStaffParams): Promise<CursorPage<Staff>> {
    return this.queryEngine.execute(Staff, params.query, STAFF_QUERY_CONFIG);
  }
}
