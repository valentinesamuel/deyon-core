import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventLog } from '@modules/core/entities/eventLog.entity';
import { BaseRepository } from './base.repository';

@Injectable()
export class EventLogRepository extends BaseRepository<EventLog> {
  private readonly logger = new Logger(EventLogRepository.name);

  constructor(
    @InjectRepository(EventLog)
    private readonly repo: Repository<EventLog>,
  ) {
    super(repo.target, repo.manager, repo.queryRunner);
  }
}
