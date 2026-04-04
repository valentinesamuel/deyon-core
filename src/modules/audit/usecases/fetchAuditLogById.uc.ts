import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventLog } from '@modules/core/entities/eventLog.entity';
import { NotFoundException } from '@nestjs/common';

type TParams = { id: string };
type TResult = { auditLog: EventLog };

@Injectable()
export class FetchAuditLogByIdUsecase extends Usecase<TResult, TParams> {
  readonly config = { requiresTransaction: false };

  constructor(
    @InjectRepository(EventLog)
    private readonly eventLogRepository: Repository<EventLog>,
  ) {
    super();
  }

  async execute(_em: EntityManager, params: TParams): Promise<TResult> {
    const auditLog = await this.eventLogRepository.findOne({ where: { id: params.id } });

    if (!auditLog) {
      throw new NotFoundException('Audit log entry not found.');
    }

    return { auditLog };
  }
}
