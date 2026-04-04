import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { RosterService } from '../service/roster.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';

type TRemoveRosterAssignmentParams = { id: string; assignmentId: string };
type TRemoveRosterAssignmentResult = { assignmentId: string; deletedAt: Date };

@Injectable()
export class RemoveRosterAssignmentUsecase extends Usecase<
  TRemoveRosterAssignmentResult,
  TRemoveRosterAssignmentParams
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
    params: TRemoveRosterAssignmentParams,
  ): Promise<TRemoveRosterAssignmentResult> {
    const { id, assignmentId } = params;

    await this.rosterService.getAssignmentOrFail(assignmentId, id, em);
    await this.rosterService.removeAssignment(assignmentId, em);

    const actorId = this.requestContextService.getUserId();
    await this.eventService.log(
      {
        actorId,
        event: EventType.ROSTER_ASSIGNMENT_REMOVED,
        module: EventModule.ROSTER,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { rosterId: id, assignmentId },
      },
      em,
    );

    return { assignmentId, deletedAt: new Date() };
  }
}
