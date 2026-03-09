import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  async log(params: EventLogParams): Promise<void> {
    try {
      const entry = this.eventLogRepository.create({
        actorId: params.actorId ?? null,
        event: params.event,
        module: params.module ?? null,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        metadata: params.metadata,
        success: params.success ?? true,
      });
      await this.eventLogRepository.save(entry);
    } catch (err) {
      // Audit must never break auth flow
      this.logger.error(
        'Failed to write audit log',
        err instanceof Error ? err.message : String(err),
      );
    }
  }
}
