import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { Staff } from '@modules/core/entities/staff.entity';
import { STAFF_QUERY_CONFIG } from '../staff.constants';
import { GetOneQueryDto, QueryEngineService } from '@shared/queryEngine';

type FetchOneStaffParams = { id: string; query: GetOneQueryDto };

@Injectable()
export class FetchOneStaffUsecase extends Usecase<Staff, FetchOneStaffParams> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly queryEngine: QueryEngineService) {
    super();
  }

  async execute(em: EntityManager, params: FetchOneStaffParams): Promise<Staff> {
    return this.queryEngine.executeOne(Staff, params.id, params.query, STAFF_QUERY_CONFIG);
  }
}
