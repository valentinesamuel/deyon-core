import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { RosterService } from '../service/roster.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { Roster } from '@modules/core/entities/roster.entity';

type TPublishRosterParams = { id: string };
type TPublishRosterResult = { roster: Roster };

@Injectable()
export class PublishRosterUsecase extends Usecase<TPublishRosterResult, TPublishRosterParams> {
  constructor(
    private readonly rosterService: RosterService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: TPublishRosterParams): Promise<TPublishRosterResult> {
    const actorId = this.requestContextService.getUserId();
    const roster = await this.rosterService.publishRoster(params.id, actorId, em);

    await this.eventService.log(
      {
        actorId,
        event: EventType.ROSTER_PUBLISHED,
        module: EventModule.ROSTER,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { rosterId: params.id },
      },
      em,
    );

    return { roster };
  }
}
