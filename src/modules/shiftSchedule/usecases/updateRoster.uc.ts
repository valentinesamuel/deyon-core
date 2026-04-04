import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { UpdateRosterDto } from '../dto/updateRoster.dto';
import { RosterService } from '../service/roster.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { Roster } from '@modules/core/entities/roster.entity';

type TUpdateRosterParams = { id: string; dto: UpdateRosterDto };
type TUpdateRosterResult = { roster: Roster };

@Injectable()
export class UpdateRosterUsecase extends Usecase<TUpdateRosterResult, TUpdateRosterParams> {
  constructor(
    private readonly rosterService: RosterService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: TUpdateRosterParams): Promise<TUpdateRosterResult> {
    const { id, dto } = params;

    const roster = await this.rosterService.updateRoster(id, dto as Partial<Roster>, em);

    const actorId = this.requestContextService.getUserId();
    await this.eventService.log(
      {
        actorId,
        event: EventType.ROSTER_UPDATED,
        module: EventModule.ROSTER,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { rosterId: id },
      },
      em,
    );

    return { roster };
  }
}
