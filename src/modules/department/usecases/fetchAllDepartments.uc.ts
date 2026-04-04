import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CursorPage, QueryEngineService, QueryInput } from '@shared/queryEngine';
import { Department } from '@modules/core/entities/department.entity';
import { DEPARTMENT_QUERY_CONFIG } from '../department.constants';

type FetchAllDepartmentsParams = { query: QueryInput };

@Injectable()
export class FetchAllDepartmentsUsecase extends Usecase<
  CursorPage<Department>,
  FetchAllDepartmentsParams
> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly queryEngine: QueryEngineService) {
    super();
  }

  async execute(
    em: EntityManager,
    params: FetchAllDepartmentsParams,
  ): Promise<CursorPage<Department>> {
    return this.queryEngine.execute(Department, params.query, DEPARTMENT_QUERY_CONFIG);
  }
}
