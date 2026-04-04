import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Usecase } from '@broker/types';
import { ShiftScheduleService } from '../service/shiftSchedule.service';
import { EventLogService } from '@modules/auth/services/eventLog.service';
import { RequestContextService } from '@shared/context/requestContext.service';
import { EventModule, EventType } from '@modules/core/entities/eventLog.entity';

type TDeleteShiftScheduleParams = { id: string };

type TDeleteShiftScheduleResult = {
  id: string;
  deletedAt: Date;
};

@Injectable()
export class DeleteShiftScheduleUsecase extends Usecase<
  TDeleteShiftScheduleResult,
  TDeleteShiftScheduleParams
> {
  readonly config = { requiresTransaction: true };

  constructor(
    private readonly shiftScheduleService: ShiftScheduleService,
    private readonly eventService: EventLogService,
    private readonly requestContextService: RequestContextService,
  ) {
    super();
  }

  async execute(
    em: EntityManager,
    params: TDeleteShiftScheduleParams,
  ): Promise<TDeleteShiftScheduleResult> {
    const { id } = params;

    await this.shiftScheduleService.softDeleteShiftSchedule(id, em);

    const actorId = this.requestContextService.getUserId();

    await this.eventService.log(
      {
        actorId,
        event: EventType.SHIFT_SCHEDULE_DELETED,
        module: EventModule.SHIFT_SCHEDULE,
        ipAddress: this.requestContextService.getIp(),
        userAgent: this.requestContextService.getUserAgent(),
        metadata: { id },
      },
      em,
    );

    return {
      id,
      deletedAt: new Date(),
    };
  }
}
