import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { RosterService } from '../service/roster.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';

type TDeleteRosterParams = { id: string };
type TDeleteRosterResult = { id: string; deletedAt: Date };

@Injectable()
export class DeleteRosterUsecase extends Usecase<TDeleteRosterResult, TDeleteRosterParams> {
  constructor(
    private readonly rosterService: RosterService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: TDeleteRosterParams): Promise<TDeleteRosterResult> {
    const { id } = params;

    await this.rosterService.softDeleteRoster(id, em);

    const actorId = this.requestContextService.getUserId();
    await this.eventService.log(
      {
        actorId,
        event: EventType.ROSTER_DELETED,
        module: EventModule.ROSTER,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { rosterId: id },
      },
      em,
    );

    return { id, deletedAt: new Date() };
  }
}
