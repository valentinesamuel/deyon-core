import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { EventLog, EventModule, EventType } from '@modules/core/entities/eventLog.entity';

export interface EventLogParams {
  actorId?: string;
  event: EventType;
  module?: EventModule;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  success?: boolean;
}

@Injectable()
export class EventLogService {
  private readonly logger = new Logger(EventLogService.name);

  constructor(
    @InjectRepository(EventLog)
    private readonly eventLogRepository: Repository<EventLog>,
  ) {}

  async log(params: EventLogParams, em?: EntityManager): Promise<void> {
    try {
      const repo = em ? em.getRepository(EventLog) : this.eventLogRepository;
      const entry = repo.create({
        actorId: params.actorId ?? null,
        event: params.event,
        module: params.module ?? null,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: params.metadata,
        success: params.success ?? true,
      });
      await repo.save(entry);
    } catch (err) {
      // Audit must never break auth flow
      this.logger.error(
        'Failed to write audit log',
        err instanceof Error ? err.message : String(err),
      );
    }
  }
}
