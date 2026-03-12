import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import {
  QueryEngineService,
  EntityQueryConfig,
  CursorPage,
  QueryInput,
} from '../../../query-engine';
import { Staff } from '@modules/core/entities/staff.entity';

type FetchAllStaffParams = { query: QueryInput };

const STAFF_QUERY_CONFIG: EntityQueryConfig<Staff> = {
  allowedFilters: [
    'id',
    'firstName',
    'lastName',
    'email',
    'phoneNumber',
    'licenseNumber',
    'specialization',
    'isApproved',
    'isActive',
    'roleId',
    'departmentId',
    'createdAt',
    'updatedAt',
    'role.name',
    'role.alias',
    'role.isActive',
    'department.name',
    'department.alias',
  ],
  allowedSort: [
    'firstName',
    'lastName',
    'email',
    'createdAt',
    'updatedAt',
    'isActive',
    'isApproved',
  ],
  allowedSearch: [
    { field: 'firstName', type: 'fts' },
    { field: 'lastName', type: 'fts' },
    { field: 'email', type: 'tri' },
  ],
  allowedRelations: ['role', 'department'],
  allowedFields: [
    'id',
    'firstName',
    'lastName',
    'email',
    'phoneNumber',
    'licenseNumber',
    'specialization',
    'isApproved',
    'isActive',
    'lastLogin',
    'roleId',
    'departmentId',
    'createdAt',
    'updatedAt',
    'role.name',
    'role.alias',
    'department.name',
    'department.alias',
  ],
  cacheTtlSeconds: 30,
};

@Injectable()
export class FetchAllStaffUsecase extends Usecase<CursorPage<Staff>, FetchAllStaffParams> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly queryEngine: QueryEngineService) {
    super();
  }

  async execute(_em: EntityManager, params: FetchAllStaffParams): Promise<CursorPage<Staff>> {
    return this.queryEngine.execute(Staff, params.query, STAFF_QUERY_CONFIG);
  }
}
