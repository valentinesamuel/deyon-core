import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { AddRosterAssignmentDto } from '../dto/addRosterAssignment.dto';
import { RosterService } from '../service/roster.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';
import { StaffShiftSchedule } from '@modules/core/entities/staffShiftSchedule.entity';

type TAddRosterAssignmentParams = { id: string; dto: AddRosterAssignmentDto };
type TAddRosterAssignmentResult = { assignment: StaffShiftSchedule };

@Injectable()
export class AddRosterAssignmentUsecase extends Usecase<
  TAddRosterAssignmentResult,
  TAddRosterAssignmentParams
> {
  constructor(
    private readonly rosterService: RosterService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(
    em: EntityManager,
    params: TAddRosterAssignmentParams,
  ): Promise<TAddRosterAssignmentResult> {
    const { id, dto } = params;

    await this.rosterService.getRosterOrFail({ where: { id } }, em);

    const assignment = await this.rosterService.addAssignment(
      { rosterId: id, staffId: dto.staffId, shiftScheduleId: dto.shiftScheduleId },
      em,
    );

    const actorId = this.requestContextService.getUserId();
    await this.eventService.log(
      {
        actorId,
        event: EventType.ROSTER_ASSIGNMENT_ADDED,
        module: EventModule.ROSTER,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { rosterId: id, staffId: dto.staffId },
      },
      em,
    );

    return { assignment };
  }
}
