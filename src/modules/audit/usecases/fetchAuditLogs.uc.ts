import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CursorPage, QueryEngineService, QueryInput } from '@shared/queryEngine';
import { EventLog } from '@modules/core/entities/eventLog.entity';

const AUDIT_QUERY_CONFIG = {
  allowedFilters: ['actorId', 'event', 'module', 'success'],
  allowedSort: ['createdAt'],
  allowedSearch: [],
  allowedRelations: [] as string[],
  allowedFields: [] as string[],
  maxRelationDepth: 0,
  cacheTtlSeconds: 5,
};

type TParams = { query: QueryInput };

@Injectable()
export class FetchAuditLogsUsecase extends Usecase<CursorPage<EventLog>, TParams> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly queryEngine: QueryEngineService) {
    super();
  }

  async execute(_em: EntityManager, params: TParams): Promise<CursorPage<EventLog>> {
    return this.queryEngine.execute(EventLog, params.query, AUDIT_QUERY_CONFIG);
  }
}
