import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CursorPage, QueryEngineService, QueryInput } from '@shared/queryEngine';
import { QueueEntry } from '@modules/core/entities/queueEntry.entity';
import { QUEUE_QUERY_CONFIG } from '../queue.constants';

type TParams = { query: QueryInput };

@Injectable()
export class FetchAllQueueEntriesUsecase extends Usecase<CursorPage<QueueEntry>, TParams> {
  readonly config = { requiresTransaction: false };

  constructor(private readonly queryEngine: QueryEngineService) {
    super();
  }

  async execute(_em: EntityManager, params: TParams): Promise<CursorPage<QueueEntry>> {
    return this.queryEngine.execute(QueueEntry, params.query, QUEUE_QUERY_CONFIG);
  }
}
