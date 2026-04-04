import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { CreateRosterDto } from '../dto/createRoster.dto';
import { RosterService } from '../service/roster.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { Roster, RosterStatusEnum } from '@modules/core/entities/roster.entity';

type TCreateRosterResult = { roster: Roster };

@Injectable()
export class CreateRosterUsecase extends Usecase<TCreateRosterResult, CreateRosterDto> {
  constructor(
    private readonly rosterService: RosterService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(em: EntityManager, params: CreateRosterDto): Promise<TCreateRosterResult> {
    const roster = await this.rosterService.createRoster(
      { ...params, status: RosterStatusEnum.DRAFT } as Partial<Roster>,
      em,
    );

    const actorId = this.requestContextService.getUserId();
    await this.eventService.log(
      {
        actorId,
        event: EventType.ROSTER_CREATED,
        module: EventModule.ROSTER,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { rosterId: roster.id, weekStartDate: params.weekStartDate },
      },
      em,
    );

    return { roster };
  }
}
